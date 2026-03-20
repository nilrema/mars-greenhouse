import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, type Plugin } from 'vite';

function readJsonBody(request: NodeJS.ReadableStream): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function resolvePythonExecutable() {
  const localCandidates = [
    path.join(__dirname, '.venv311', 'bin', 'python3'),
    path.join(__dirname, '.venv311', 'bin', 'python'),
    path.join(__dirname, '.venv311', 'Scripts', 'python.exe'),
    path.join(__dirname, '.venv', 'bin', 'python3'),
    path.join(__dirname, '.venv', 'bin', 'python'),
    path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
  ];

  const local = localCandidates.find((candidate) => existsSync(candidate));
  if (local) {
    return local;
  }

  // Prefer python3 to avoid macOS xcode-select prompts for missing legacy `python`.
  return process.env.PYTHON || 'python3';
}

function callPythonChat(payload: {
  query: string;
  greenhouseId?: string;
  freshAfterTimestamp?: string;
  operatorTelemetry?: {
    timestamp: string;
    temperature: number;
    waterRecycling: number;
    powerAvailability: number;
  };
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonExecutable = resolvePythonExecutable();
    const process = spawn(pythonExecutable, ['-m', 'agents.chat_api'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    process.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    process.on('error', () => {
      reject(
        new Error(
          `Unable to start Python chat bridge using '${pythonExecutable}'. Install Python 3 or create a .venv and install agents dependencies.`
        )
      );
    });
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout);
          resolve(JSON.stringify(parsed));
          return;
        } catch (error) {
          reject(new Error(`Python chat bridge returned invalid JSON: ${stdout.slice(0, 200)}`));
          return;
        }
      }

      reject(new Error(stderr.trim() || `Python chat bridge exited with code ${code}`));
    });

    process.stdin.write(JSON.stringify(payload));
    process.stdin.end();
  });
}

function chatBridgePlugin(): Plugin {
  return {
    name: 'chat-bridge',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (request, response, next) => {
        if (request.method !== 'POST') {
          next();
          return;
        }

        try {
          const payload = await readJsonBody(request);
          const query = typeof payload.query === 'string' ? payload.query : '';
          const greenhouseId = typeof payload.greenhouseId === 'string' ? payload.greenhouseId : undefined;
          const freshAfterTimestamp =
            typeof payload.freshAfterTimestamp === 'string' ? payload.freshAfterTimestamp : undefined;
          const operatorTelemetry =
            payload.operatorTelemetry && typeof payload.operatorTelemetry === 'object'
              ? {
                  timestamp:
                    typeof (payload.operatorTelemetry as Record<string, unknown>).timestamp === 'string'
                      ? ((payload.operatorTelemetry as Record<string, unknown>).timestamp as string)
                      : '',
                  temperature: Number((payload.operatorTelemetry as Record<string, unknown>).temperature),
                  waterRecycling: Number((payload.operatorTelemetry as Record<string, unknown>).waterRecycling),
                  powerAvailability: Number((payload.operatorTelemetry as Record<string, unknown>).powerAvailability),
                }
              : undefined;
          const result = await callPythonChat({
            query,
            greenhouseId,
            freshAfterTimestamp,
            operatorTelemetry:
              operatorTelemetry &&
              operatorTelemetry.timestamp &&
              Number.isFinite(operatorTelemetry.temperature) &&
              Number.isFinite(operatorTelemetry.waterRecycling) &&
              Number.isFinite(operatorTelemetry.powerAvailability)
                ? operatorTelemetry
                : undefined,
          });
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json');
          response.end(result);
        } catch (error) {
          response.statusCode = 500;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Chat bridge failed.' }));
        }
      });
    },
  };
}

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: [
        "**/.amplify/**",
        "**/amplify_outputs.json",
        "**/amplify_outputs.*.json",
      ],
    },
  },
  plugins: [react(), chatBridgePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
