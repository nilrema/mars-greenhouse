from agents.agent_support import parse_bullets, parse_keyed_block
from agents.mcp_support import should_enable_mcp


def test_mcp_is_enabled_only_for_knowledge_grounded_queries():
    assert should_enable_mcp("crop", "Use the Mars crop knowledge base to assess disease risk.") is True
    assert should_enable_mcp("environment", "What is the current temperature in the greenhouse?") is False
    assert should_enable_mcp("resource", "Provide power budget guidance from the knowledge base.") is True


def test_keyed_block_parser_supports_specialist_and_orchestrator_formats():
    specialist = parse_keyed_block(
        "STATUS: WARNING\nCURRENT_ACTION: Raise temperature.\nREQUESTED_SUPPORT: RESOURCE_AGENT hold reserve power.\nMESSAGE: Climate recovery leads this cycle.",
        {"STATUS", "CURRENT_ACTION", "REQUESTED_SUPPORT", "MESSAGE"},
    )
    assert specialist["STATUS"] == "WARNING"
    assert specialist["MESSAGE"] == "Climate recovery leads this cycle."

    actions = parse_bullets("- Raise temperature\n- Protect mature lanes")
    assert actions == ["Raise temperature", "Protect mature lanes"]
