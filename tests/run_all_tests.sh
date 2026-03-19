#!/bin/bash
# Run all Mars Greenhouse agent integration tests

set -e  # Exit on error

echo "🚀 Mars Greenhouse - Comprehensive Agent Integration Test Suite"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_script="$2"
    
    echo -e "\n${BLUE}▶ Running: ${test_name}${NC}"
    echo "----------------------------------------"
    
    if python3 "$test_script"; then
        echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ ${test_name} FAILED${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    echo ""
}

# Check if we're in the right directory
if [ ! -f "tests/test_agent_integration.py" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Check Python version
echo "Python version: $(python3 --version)"
echo "Current directory: $(pwd)"
echo ""

# Run tests in order
echo "📋 Test Suite Overview:"
echo "1. MCP Connection Test - Tests MCP knowledge base connectivity"
echo "2. End-to-End Workflow - Simulates complete agent orchestration"
echo "3. Agent Integration - Comprehensive integration tests"
echo ""

# Test 1: MCP Connection
run_test "MCP Knowledge Base Connection Test" "tests/test_mcp_connection.py"

# Test 2: End-to-End Workflow
run_test "End-to-End Agent Workflow Test" "tests/test_end_to_end.py"

# Test 3: Full Integration Test
run_test "Comprehensive Agent Integration Test" "tests/test_agent_integration.py"

# Summary
echo "================================================================"
echo -e "${YELLOW}📊 TEST SUMMARY${NC}"
echo "================================================================"
echo -e "Total Tests Run: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "The Mars Greenhouse agent system is fully integrated and working."
    echo "Components verified:"
    echo "  ✓ MCP Knowledge Base connectivity"
    echo "  ✓ Bedrock Claude AI integration"
    echo "  ✓ Agent orchestration workflow"
    echo "  ✓ Sensor/actuator tool integration"
    echo "  ✓ End-to-end data flow"
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
    echo "Please check the test output above for details."
    exit 1
fi