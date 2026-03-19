"""
Helpers for talking to the deployed Amplify AppSync API.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx

ROOT_DIR = Path(__file__).resolve().parent.parent
AMPLIFY_OUTPUTS_PATH = ROOT_DIR / "amplify_outputs.json"


def load_amplify_outputs() -> dict[str, Any]:
    if not AMPLIFY_OUTPUTS_PATH.exists():
        raise RuntimeError(
            "amplify_outputs.json not found. Run `npm run amplify:dev` first."
        )

    with AMPLIFY_OUTPUTS_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_runtime_region() -> str:
    outputs = load_amplify_outputs()
    return os.environ.get(
        "AWS_REGION",
        outputs.get("data", {}).get("aws_region")
        or outputs.get("auth", {}).get("aws_region")
        or "us-west-2",
    )


def get_graphql_config() -> tuple[str, str]:
    outputs = load_amplify_outputs()
    endpoint = outputs.get("data", {}).get("url")
    api_key = outputs.get("data", {}).get("api_key")

    if not endpoint or not api_key:
        raise RuntimeError(
            "AppSync configuration missing in amplify_outputs.json."
        )

    return endpoint, api_key


def execute_graphql(query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
    endpoint, api_key = get_graphql_config()

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            endpoint,
            json={"query": query, "variables": variables or {}},
            headers={
                "content-type": "application/json",
                "x-api-key": api_key,
            },
        )
        response.raise_for_status()
        payload = response.json()

    if payload.get("errors"):
        raise RuntimeError(json.dumps(payload["errors"]))

    return payload["data"]
