#!/usr/bin/env python3
"""
Check prerequisites for Mars Greenhouse Agent tests
Verifies that all required services are accessible
"""

import os
import sys
import boto3
import json
from datetime import datetime

def check_aws_credentials():
    """Check if AWS credentials are configured"""
    print("🔐 Checking AWS Credentials...")
    try:
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        print(f"  ✓ AWS Account: {identity['Account']}")
        print(f"  ✓ User/Role: {identity['Arn']}")
        return True
    except Exception as e:
        print(f"  ✗ AWS credentials not configured: {e}")
        print("  → Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN")
        return False

def check_bedrock_access():
    """Check if Bedrock is accessible"""
    print("\n🤖 Checking Bedrock Access...")
    try:
        bedrock = boto3.client('bedrock-runtime', region_name=os.getenv('AWS_REGION', 'us-west-2'))
        
        # Try to invoke Claude
        model_id = "us.anthropic.claude-sonnet-4-5"
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 50,
            "messages": [{"role": "user", "content": "Test"}]
        })
        
        response = bedrock.invoke_model(modelId=model_id, body=body)
        print(f"  ✓ Bedrock accessible")
        print(f"  ✓ Model: {model_id}")
        return True
    except Exception as e:
        print(f"  ✗ Bedrock not accessible: {e}")
        print("  → Ensure Bedrock model access is enabled in your AWS account")
        return False

def check_dynamodb_tables():
    """Check if DynamoDB tables exist"""
    print("\n📊 Checking DynamoDB Tables...")
    try:
        dynamodb = boto3.client('dynamodb', region_name=os.getenv('AWS_REGION', 'us-west-2'))
        response = dynamodb.list_tables()
        tables = response.get('TableNames', [])
        
        print(f"  Found {len(tables)} tables")
        
        required = ['SensorReading', 'AgentEvent', 'CropRecord']
        found = []
        for req in required:
            matching = [t for t in tables if req in t]
            if matching:
                print(f"  ✓ {req}: {matching[0]}")
                found.append(req)
            else:
                print(f"  ✗ {req}: Not found")
        
        if len(found) == 0:
            print("  → Run 'npm run amplify:dev' to create tables")
            return False
        
        return len(found) > 0
    except Exception as e:
        print(f"  ✗ DynamoDB not accessible: {e}")
        return False

def check_mcp_endpoint():
    """Check if MCP endpoint is configured"""
    print("\n📚 Checking MCP Configuration...")
    mcp_url = os.getenv('KB_MCP_URL')
    if mcp_url:
        print(f"  ✓ MCP URL configured: {mcp_url[:50]}...")
        return True
    else:
        print("  ✗ KB_MCP_URL not set in environment")
        print("  → Set KB_MCP_URL in agents/.env file")
        return False

def check_amplify_outputs():
    """Check if Amplify outputs exist"""
    print("\n⚡ Checking Amplify Configuration...")
    outputs_file = 'amplify_outputs.json'
    if os.path.exists(outputs_file):
        print(f"  ✓ {outputs_file} exists")
        try:
            with open(outputs_file) as f:
                data = json.load(f)
                if 'data' in data:
                    print(f"  ✓ GraphQL API configured")
                return True
        except:
            pass
    
    print(f"  ✗ {outputs_file} not found")
    print("  → Run 'npm run amplify:dev' to generate configuration")
    return False

def check_python_dependencies():
    """Check if Python dependencies are installed"""
    print("\n🐍 Checking Python Dependencies...")
    required = ['boto3', 'strands', 'httpx']
    missing = []
    
    for pkg in required:
        try:
            __import__(pkg)
            print(f"  ✓ {pkg}")
        except ImportError:
            print(f"  ✗ {pkg}")
            missing.append(pkg)
    
    if missing:
        print(f"  → Install: pip install {' '.join(missing)}")
        return False
    
    return True

def main():
    """Run all prerequisite checks"""
    print("="*60)
    print("Mars Greenhouse - Prerequisites Check")
    print("="*60)
    
    checks = [
        ("AWS Credentials", check_aws_credentials),
        ("Python Dependencies", check_python_dependencies),
        ("MCP Configuration", check_mcp_endpoint),
        ("Amplify Configuration", check_amplify_outputs),
        ("DynamoDB Tables", check_dynamodb_tables),
        ("Bedrock Access", check_bedrock_access),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"\n  ✗ {name} check failed: {e}")
            results[name] = False
    
    # Summary
    print("\n" + "="*60)
    print("Summary")
    print("="*60)
    
    passed = sum(results.values())
    total = len(results)
    
    for name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\nPassed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ All prerequisites met! You can run the tests.")
        return 0
    else:
        print("\n⚠️  Some prerequisites missing. Fix the issues above before running tests.")
        print("\nQuick Start:")
        print("  1. Set AWS credentials: export AWS_ACCESS_KEY_ID=...")
        print("  2. Start Amplify: npm run amplify:dev")
        print("  3. Configure MCP: Set KB_MCP_URL in agents/.env")
        print("  4. Install deps: pip install -r agents/requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())
