"""Shared Bedrock defaults for the Mars greenhouse agents."""

from __future__ import annotations

import os
from functools import lru_cache

import boto3

DEFAULT_BEDROCK_REGION = "us-west-2"
DEFAULT_ORCHESTRATOR_MODEL = "us.amazon.nova-micro-v1:0"
DEFAULT_SPECIALIST_MODEL = "us.amazon.nova-lite-v1:0"
DEFAULT_BEDROCK_MODEL = DEFAULT_SPECIALIST_MODEL
_GEOGRAPHY_PREFIXES_BY_REGION = {
    "us-": "us",
    "eu-": "eu",
    "ap-": "apac",
}


def _resolve_bedrock_region() -> str:
    """Return the Bedrock region used by the agent system."""
    region = os.getenv("AGENT_AWS_REGION") or DEFAULT_BEDROCK_REGION
    os.environ["AWS_REGION"] = region
    os.environ["AWS_DEFAULT_REGION"] = region
    return region


def _region_geography_prefix(region: str) -> str | None:
    for region_prefix, geography in _GEOGRAPHY_PREFIXES_BY_REGION.items():
        if region.startswith(region_prefix):
            return geography
    return None


def _candidate_inference_profile_ids(model_id: str, region: str) -> list[str]:
    if "." in model_id:
        prefix = model_id.split(".", 1)[0]
        if prefix in {"us", "eu", "apac", "global"}:
            return [model_id]

    candidates: list[str] = []
    geography = _region_geography_prefix(region)
    if geography:
        candidates.append(f"{geography}.{model_id}")
    candidates.append(f"global.{model_id}")
    candidates.append(model_id)
    return candidates


@lru_cache(maxsize=4)
def _list_system_inference_profile_ids(region: str) -> frozenset[str]:
    """Return system inference profile IDs visible in the configured Bedrock region."""
    client = boto3.client("bedrock", region_name=region)
    paginator = client.get_paginator("list_inference_profiles")
    profile_ids: set[str] = set()
    for page in paginator.paginate(typeEquals="SYSTEM_DEFINED"):
        for summary in page.get("inferenceProfileSummaries", []):
            profile_id = summary.get("inferenceProfileId")
            if profile_id:
                profile_ids.add(str(profile_id))
    return frozenset(profile_ids)


def normalize_bedrock_model_id(model_id: str, *, region: str | None = None) -> str:
    """Prefer a Bedrock system inference profile ID when one is available for the model."""
    resolved_region = region or _resolve_bedrock_region()
    candidates = _candidate_inference_profile_ids(model_id, resolved_region)

    try:
        available_profiles = _list_system_inference_profile_ids(resolved_region)
    except Exception:
        return model_id

    for candidate in candidates:
        if candidate in available_profiles:
            return candidate
    return model_id


def resolve_bedrock_model(agent_role: str = "default") -> str:
    """Return the Bedrock model ID used by the agent system."""
    region = _resolve_bedrock_region()
    explicit_model = os.getenv("STRANDS_MODEL") or os.getenv("BEDROCK_MODEL_ID")
    if explicit_model:
        return normalize_bedrock_model_id(explicit_model, region=region)

    role_specific_model = ""
    if agent_role == "orchestrator":
        role_specific_model = os.getenv("STRANDS_ORCHESTRATOR_MODEL", "").strip()
    elif agent_role == "specialist":
        role_specific_model = os.getenv("STRANDS_SPECIALIST_MODEL", "").strip()

    if role_specific_model:
        return normalize_bedrock_model_id(role_specific_model, region=region)

    if agent_role == "orchestrator":
        return DEFAULT_ORCHESTRATOR_MODEL
    return DEFAULT_SPECIALIST_MODEL
