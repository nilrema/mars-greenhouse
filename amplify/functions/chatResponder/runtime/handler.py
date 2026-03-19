from __future__ import annotations

from chat_responder_runtime.service import StrandsBackend, build_chat_response


def handler(event, context):
    arguments = event.get("arguments") or {}
    with StrandsBackend() as backend:
        return build_chat_response(arguments, backend=backend)
