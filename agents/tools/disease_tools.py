"""Disease inspection helpers backed by Bedrock multimodal vision models."""

from __future__ import annotations

import base64
import json
import os
import re
from datetime import datetime, timezone
from typing import Any

import boto3

from agents.bedrock_config import DEFAULT_BEDROCK_REGION

DEFAULT_DISEASE_MODEL = os.getenv("BEDROCK_DISEASE_MODEL", "us.amazon.nova-lite-v1:0").strip() or "us.amazon.nova-lite-v1:0"
DATA_URL_RE = re.compile(r"^data:(image/(?:png|jpeg|jpg|webp));base64,(.+)$", re.IGNORECASE | re.DOTALL)
RISK_LEVELS = {"low", "medium", "high"}
SEVERITY_TO_RISK = {
    "mild": "low",
    "moderate": "medium",
    "severe": "high",
    "critical": "high",
}


def _bedrock_region() -> str:
    return (
        os.getenv("AGENT_AWS_REGION")
        or os.getenv("AWS_REGION")
        or os.getenv("AWS_DEFAULT_REGION")
        or DEFAULT_BEDROCK_REGION
    )


def _decode_image_data_url(image_data_url: str) -> tuple[bytes, str]:
    match = DATA_URL_RE.match(image_data_url.strip())
    if not match:
        raise ValueError("Inspection image must be a base64 data URL with png, jpeg, jpg, or webp content.")

    media_type = match.group(1).lower().replace("jpg", "jpeg")
    try:
        image_bytes = base64.b64decode(match.group(2), validate=True)
    except Exception as exc:
        raise ValueError("Inspection image data URL could not be decoded.") from exc

    if not image_bytes:
        raise ValueError("Inspection image data URL was empty.")

    return image_bytes, media_type


def _extract_text_from_nova_response(response_body: dict[str, Any]) -> str:
    parts = response_body.get("output", {}).get("message", {}).get("content", [])
    texts = [str(part.get("text", "")).strip() for part in parts if isinstance(part, dict) and part.get("text")]
    return "\n".join(filter(None, texts)).strip()


def _normalize_risk_level(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text in RISK_LEVELS:
        return text
    if text in SEVERITY_TO_RISK:
        return SEVERITY_TO_RISK[text]
    return "medium"


def _normalize_disease(value: Any) -> str:
    text = str(value or "").strip().strip(".")
    if not text:
        return "none detected"
    if text.lower() in {"none", "none detected", "no disease", "no disease detected"}:
        return "none detected"
    return text


def _assessment_from_text(text: str) -> dict[str, str]:
    if not text:
        return {
            "disease": "unknown",
            "riskLevel": "medium",
            "explanation": "The image analysis returned no explanation.",
        }

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = None

    if isinstance(parsed, dict):
        disease = parsed.get("disease") or parsed.get("condition")
        risk_level = parsed.get("riskLevel") or parsed.get("risk_level") or parsed.get("severity")
        explanation = parsed.get("explanation") or parsed.get("summary") or parsed.get("reason")
        return {
            "disease": _normalize_disease(disease),
            "riskLevel": _normalize_risk_level(risk_level),
            "explanation": str(explanation or "The crop image suggests follow-up inspection.").strip(),
        }

    disease_match = re.search(r"disease\s*[:\-]\s*(.+)", text, re.IGNORECASE)
    explanation_match = re.search(r"(?:explanation|summary|reason)\s*[:\-]\s*(.+)", text, re.IGNORECASE)
    risk_match = re.search(r"\b(low|medium|high|mild|moderate|severe|critical)\b", text, re.IGNORECASE)
    first_sentence = re.split(r"(?<=[.!?])\s+", text.strip(), maxsplit=1)[0]
    return {
        "disease": _normalize_disease(disease_match.group(1).strip() if disease_match else "unknown"),
        "riskLevel": _normalize_risk_level(risk_match.group(1) if risk_match else "medium"),
        "explanation": explanation_match.group(1).strip() if explanation_match else first_sentence,
    }


def inspect_disease_risk(
    image_data_url: str,
    *,
    selection: dict[str, Any] | None = None,
    camera_id: str | None = None,
) -> dict[str, Any]:
    """Analyze a cropped crop image with Bedrock Nova and return a concise risk assessment."""
    try:
        image_bytes, media_type = _decode_image_data_url(image_data_url)
        image_format = media_type.split("/", 1)[1]
        bedrock = boto3.client("bedrock-runtime", region_name=_bedrock_region())

        prompt = (
            "You are an expert plant pathologist for a Mars greenhouse.\n"
            "Analyze this crop image and return compact JSON with exactly these keys:\n"
            '  "disease": string, use "none detected" if nothing clear is visible\n'
            '  "riskLevel": one of "low", "medium", "high"\n'
            '  "explanation": one short sentence\n'
            "Base the answer on the actual image. Do not include markdown or extra keys.\n"
            f"Camera: {camera_id or 'unknown'}\n"
            f"Selection metadata: {json.dumps(selection or {}, separators=(',', ':'))}"
        )

        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "image": {
                                "format": image_format,
                                "source": {
                                    "bytes": base64.b64encode(image_bytes).decode("utf-8"),
                                },
                            },
                        },
                        {
                            "text": prompt,
                        },
                    ],
                }
            ],
            "inferenceConfig": {
                "maxTokens": 300,
                "temperature": 0.1,
                "topP": 0.9,
            },
        }

        response = bedrock.invoke_model(
            modelId=DEFAULT_DISEASE_MODEL,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )
        response_body = json.loads(response["body"].read())
        analysis_text = _extract_text_from_nova_response(response_body)
        assessment = _assessment_from_text(analysis_text)

        return {
            "disease": assessment["disease"],
            "riskLevel": assessment["riskLevel"],
            "explanation": assessment["explanation"],
            "model": DEFAULT_DISEASE_MODEL,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "rawAnalysis": analysis_text,
        }
    except Exception as exc:
        return {
            "error": str(exc),
            "disease": "unknown",
            "riskLevel": "medium",
            "explanation": "The disease inspection could not be completed.",
        }
