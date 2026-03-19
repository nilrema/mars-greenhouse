# Mars Greenhouse Agent Integration Tests

This test suite verifies that the Mars Greenhouse agents work correctly with:
- **AWS Bedrock** (Claude Sonnet AI)
- **MCP Knowledge Base** (Model Context Protocol)
- **DynamoDB** (Sensor data storage)
- **AppSync GraphQL API** (Real-time data)
- **Agent orchestration** (Multi-agent coordination)

## Why Tests Might Fail

The integration tests require several services to be running:

### ❌ Common Failure: "Bedrock connection failed"
**Cause**: AWS Bedrock not accessible or model not enabled
**Fix**:
```bash
# 1. Ensure AWS credentials are set
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_SESSION_TOKEN="your-token"

# 2. Verify Bedrock access
aws bedrock list-foundation-models --region us-west-2

# 3. Enable Claude Sonnet model in AWS Console
# Go to: Bedrock → Model access → Request access
```

### ❌ Common Failure: "DynamoDB connection failed"
**Cause**: Amplify sandbox not running (tables don't exist)
**Fix**:
```bash
# Start Amplify sandbox (creates DynamoDB tables)
npm run amplify:dev

# Wait for: "✔ Deployed"
# Then run tests in another terminal
```

### ❌ Common Failure: "Sensor tools failed"
**Cause**: AppSync GraphQL API not available
**Fix**:
```bash
# Ensure Amplify sandbox is running
npm run amplify:dev

# Check amplify_outputs.json exists
ls amplify_outputs.json
```

### ❌ Common Failure: "Orchestrator failed"
**Cause**: Missing MCP endpoint or Bedrock access
**Fix**:
```bash
# Set MCP URL in agents/.env
echo 'KB_MCP_URL=https://your-mcp-endpoint/mcp' >> agents/.env

# Verify all prerequisites
python3 tests/check_prerequisites.py
```

## Running Tests

### Step 1: Check Prerequisites
```bash
python3 tests/check_prerequisites.py
```

This will show you what's missing:
```
🔐 Checking AWS Credentials...
  ✓ AWS Account: 123456789012
  ✓ User/Role: arn:aws:sts::...

🐍 Checking Python Dependencies...
  ✓ boto3
  ✓ strands
  ✓ httpx

📚 Checking MCP Configuration...
  ✗ KB_MCP_URL not set in environment
  → Set KB_MCP_URL in agents/.env file

⚡ Checking Amplify Configuration...
  ✗ amplify_outputs.json not found
  → Run 'npm run amplify:dev' to generate configuration
```

### Step 2: Start Required Services
```bash
# Terminal 1: Start Amplify backend
npm run amplify:dev

# Wait for deployment to complete
# You should see: "✔ Deployed"
```

### Step 3: Run Tests
```bash
# Quick simulation test (no services required)
./tests/run_tests.sh

# Full integration test (requires services)
python3 tests/test_agent_integration.py

# All tests with detailed output
./tests/run_all_tests.sh
```

## Test Modes

### 1. Simulation Mode (No Services Required)
```bash
./tests/run_tests.sh
```
- Tests agent logic and data flow
- Uses mock data
- Doesn't require AWS services
- ✅ Always passes

### 2. Integration Mode (Requires Services)
```bash
python3 tests/test_agent_integration.py
```
- Tests real AWS connections
- Requires Amplify sandbox running
- Requires Bedrock access
- May fail if services not available

## Test Files

### 1. `check_prerequisites.py`
Checks if all required services are accessible.

**Run this first!**
```bash
python3 tests/check_prerequisites.py
```

### 2. `test_mcp_connection.py`
Tests MCP knowledge base and Bedrock connectivity.

### 3. `test_end_to_end.py`
Simulates complete agent workflow (no services required).

### 4. `test_agent_integration.py`
Comprehensive integration tests (requires services).

## Expected Output

### When Services Are Running:
```
🚀 Starting Mars Greenhouse Agent Integration Tests
============================================================
✓ MCP Knowledge Base connection successful
✓ Bedrock connection successful
✓ DynamoDB connection successful
✓ Sensor tools working
✓ Actuator control operational
✓ Knowledge base integration working
✓ Orchestrator agent test passed

Test Results Summary:
Total Tests: 7
Passed: 7
Failed: 0
Success Rate: 100.0%

✅ ALL TESTS PASSED!
```

### When Services Are NOT Running:
```
Test Results Summary:
Total Tests: 7
Passed: 3
Failed: 4
Success Rate: 42.9%

Detailed Results:
  mcp_connection: ✓ PASS
  bedrock_connection: ✗ FAIL (requires AWS credentials)
  dynamodb_connection: ✗ FAIL (requires Amplify sandbox)
  sensor_tools: ✗ FAIL (requires Amplify sandbox)
  actuator_control: ✓ PASS
  knowledge_base: ✓ PASS
  orchestrator: ✗ FAIL (requires full stack)
```

## Quick Fix Guide

| Error | Solution |
|-------|----------|
| AWS credentials not configured | `export AWS_ACCESS_KEY_ID=...` |
| Bedrock not accessible | Enable model access in AWS Console |
| DynamoDB tables not found | Run `npm run amplify:dev` |
| MCP URL not set | Add `KB_MCP_URL` to `agents/.env` |
| amplify_outputs.json missing | Run `npm run amplify:dev` |

## Full Setup Checklist

- [ ] AWS credentials configured
- [ ] Amplify sandbox running (`npm run amplify:dev`)
- [ ] Bedrock model access enabled
- [ ] MCP URL configured in `agents/.env`
- [ ] Python dependencies installed (`pip install -r agents/requirements.txt`)
- [ ] `amplify_outputs.json` exists

## Running Tests Without Full Stack

If you just want to verify the agent logic works:

```bash
# Run simulation tests (no AWS required)
python3 tests/test_end_to_end.py

# This will show the complete workflow:
# Sensor → MCP → Bedrock → Actuator → Dashboard
```

This demonstrates the agent architecture without requiring AWS services.