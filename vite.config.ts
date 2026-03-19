import { spawn } from 'node:child_process';
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

function callPythonChat(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('.venv/bin/python', ['-m', 'agents.chat_api'], {
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
    process.on('error', reject);
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

    process.stdin.write(JSON.stringify({ query }));
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
          const result = await callPythonChat(query);
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
