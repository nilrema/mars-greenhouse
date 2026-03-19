import { spawn } from 'node:child_process';
import { submitChatMessageResponseSchema, type SubmitChatMessageRequest, type SubmitChatMessageResponse } from '../../../src/components/mission/chatContract';
import { buildEmbeddedRuntimeResponse } from './embeddedRuntime';

const DEFAULT_PYTHON_CANDIDATES = ['.venv/bin/python', 'python3', 'python'];

function isSpawnNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function getPythonCandidates(): string[] {
  const configured = process.env.CHAT_RUNTIME_PYTHON?.trim();
  return configured ? [configured] : DEFAULT_PYTHON_CANDIDATES;
}

function runPythonRuntime(pythonExecutable: string, input: SubmitChatMessageRequest): Promise<SubmitChatMessageResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, ['-m', 'agents.chat_runtime'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Chat runtime exited with code ${code}.`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(submitChatMessageResponseSchema.parse(parsed));
      } catch (error) {
        reject(
          new Error(
            `Chat runtime returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    });

    child.stdin.end(JSON.stringify(input));
  });
}

export async function runChatRuntime(input: SubmitChatMessageRequest): Promise<SubmitChatMessageResponse> {
  const errors: string[] = [];
  let missingExecutableOnly = true;

  for (const pythonExecutable of getPythonCandidates()) {
    try {
      return await runPythonRuntime(pythonExecutable, input);
    } catch (error) {
      missingExecutableOnly = missingExecutableOnly && isSpawnNotFound(error);
      errors.push(`${pythonExecutable}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (missingExecutableOnly) {
    return buildEmbeddedRuntimeResponse(input);
  }

  throw new Error(`Unable to start the retained agent runtime. ${errors.join(' | ')}`);
}
