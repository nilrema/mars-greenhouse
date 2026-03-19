import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';
import { Architecture, Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeDir = path.join(__dirname, 'runtime');
const repoRoot = path.join(__dirname, '..', '..', '..');

export const chatResponder = defineFunction(
  (scope) =>
    new LambdaFunction(scope, 'chatResponderPython', {
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.X86_64,
      handler: 'handler.handler',
      timeout: Duration.seconds(60),
      memorySize: 1024,
      code: Code.fromAsset(repoRoot, {
        bundling: {
          image: Runtime.PYTHON_3_12.bundlingImage,
          command: [
            'bash',
            '-lc',
            [
              `pip install --no-cache-dir -r /asset-input/${path.relative(repoRoot, runtimeDir)}/requirements.txt -t /asset-output`,
              `cp -r /asset-input/${path.relative(repoRoot, runtimeDir)}/* /asset-output/`,
              'cp -r /asset-input/agents /asset-output/agents',
            ].join(' && '),
          ],
        },
      }),
      environment: {
        STRANDS_MODEL_ID: process.env.STRANDS_MODEL_ID ?? 'us.amazon.nova-pro-v1:0',
        KB_MCP_URL:
          process.env.KB_MCP_URL ??
          'https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp',
        GATEWAY_CLIENT_ID: process.env.GATEWAY_CLIENT_ID ?? '',
        GATEWAY_CLIENT_SECRET: process.env.GATEWAY_CLIENT_SECRET ?? '',
        GATEWAY_TOKEN_ENDPOINT: process.env.GATEWAY_TOKEN_ENDPOINT ?? '',
        GATEWAY_SCOPE: process.env.GATEWAY_SCOPE ?? '',
      },
    }),
  { resourceGroupName: 'data' },
);
