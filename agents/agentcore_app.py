"""
Bedrock AgentCore entrypoint for the retained Strands runtime.
"""

from __future__ import annotations

from agents.chat_runtime import build_chat_response

try:
    from bedrock_agentcore.runtime import BedrockAgentCoreApp
except ModuleNotFoundError:  # pragma: no cover - local environments may not have the SDK yet
    class BedrockAgentCoreApp:  # type: ignore[override]
        def entrypoint(self, fn):
            return fn

        def run(self) -> None:
            raise RuntimeError("bedrock-agentcore is not installed. Install it from agents/requirements.txt.")


app = BedrockAgentCoreApp()


@app.entrypoint
def invoke(payload):
    return build_chat_response(payload)


if __name__ == "__main__":
    app.run()
