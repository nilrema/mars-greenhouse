import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.tools import kb_tools


def test_query_knowledge_base_uses_first_available_tool(monkeypatch):
    captured = {}

    class FakeResult:
        def model_dump(self, mode="json"):
            assert mode == "json"
            return {"content": [{"text": "ok"}]}

    class FakeClient:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def list_tools_sync(self):
            return [type("Tool", (), {"tool_name": "mars_search", "inputSchema": {"properties": {"query": {"type": "string"}}}})()]

        def call_tool_sync(self, tool_use_id, tool_name, arguments):
            captured["tool_use_id"] = tool_use_id
            captured["tool_name"] = tool_name
            captured["arguments"] = arguments
            return FakeResult()

    monkeypatch.setattr(kb_tools, "build_mars_kb_tools", lambda: [FakeClient()])

    payload = json.loads(kb_tools.query_knowledge_base("Find lettuce guidance"))

    assert captured == {
        "tool_use_id": "mars_search-1",
        "tool_name": "mars_search",
        "arguments": {"query": "Find lettuce guidance"},
    }
    assert payload["result"] == {"content": [{"text": "ok"}]}
