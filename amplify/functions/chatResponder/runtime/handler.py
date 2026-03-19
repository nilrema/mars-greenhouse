from __future__ import annotations

from chat_responder_runtime.service import build_chat_response


def handler(event, context):
    arguments = event.get("arguments") or {}
    return build_chat_response(arguments)
