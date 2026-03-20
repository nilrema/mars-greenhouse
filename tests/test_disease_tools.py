import base64
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.tools import disease_tools


def _png_data_url() -> str:
    return "data:image/png;base64," + base64.b64encode(b"fake-png-bytes").decode("ascii")


def test_decode_image_data_url_accepts_png():
    image_bytes, media_type = disease_tools._decode_image_data_url(_png_data_url())
    assert image_bytes == b"fake-png-bytes"
    assert media_type == "image/png"


def test_inspect_disease_risk_invokes_bedrock_with_image_bytes(monkeypatch):
    captured = {}

    class FakeBody:
        def read(self):
            return json.dumps({
                "output": {
                    "message": {
                        "content": [
                            {
                                "text": json.dumps({
                                    "disease": "Powdery mildew",
                                    "riskLevel": "high",
                                    "explanation": "White powdery leaf patches suggest an active fungal issue.",
                                })
                            }
                        ]
                    }
                }
            }).encode("utf-8")

    class FakeBedrockClient:
        def invoke_model(self, **kwargs):
            captured.update(kwargs)
            return {"body": FakeBody()}

    monkeypatch.setattr(disease_tools.boto3, "client", lambda service_name, region_name=None: FakeBedrockClient())

    result = disease_tools.inspect_disease_risk(
        _png_data_url(),
        selection={"normalizedBounds": {"x": 0.2, "y": 0.3}},
        camera_id="CAM-01",
    )

    assert captured["modelId"] == disease_tools.DEFAULT_DISEASE_MODEL
    request_body = json.loads(captured["body"])
    image_part = request_body["messages"][0]["content"][0]["image"]
    assert image_part["format"] == "png"
    assert base64.b64decode(image_part["source"]["bytes"]) == b"fake-png-bytes"
    assert result["disease"] == "Powdery mildew"
    assert result["riskLevel"] == "high"


def test_inspect_disease_risk_returns_safe_error_shape(monkeypatch):
    class FailingBedrockClient:
        def invoke_model(self, **kwargs):
            raise RuntimeError("bedrock unavailable")

    monkeypatch.setattr(disease_tools.boto3, "client", lambda service_name, region_name=None: FailingBedrockClient())

    result = disease_tools.inspect_disease_risk(_png_data_url())

    assert result["error"] == "bedrock unavailable"
    assert result["disease"] == "unknown"
    assert result["riskLevel"] == "medium"
    assert result["explanation"] == "The disease inspection could not be completed."
