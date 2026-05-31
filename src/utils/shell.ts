import { execSync, spawn, type ChildProcess } from 'node:child_process';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a shell command synchronously and capture output.
 */
export function execCommand(command: string): CommandResult {
  try {
    const stdout = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30_000,
    });
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    return {
      stdout: err.stdout?.toString().trim() ?? '',
      stderr: err.stderr?.toString().trim() ?? '',
      exitCode: err.status ?? 1,
    };
  }
}

/**
 * Execute an interactive shell command (inherits stdio).
 * Used for commands like `coral source add --interactive github`.
 */
export function execInteractive(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32', // Only use shell on Windows to resolve .cmd
    });
    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', reject);
  });
}

/**
 * Execute a command and stream stdout line by line via callback.
 */
export function execStreaming(
  command: string,
  args: string[],
  onLine: (line: string) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(onLine);
    });
    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(onLine);
    });
    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', reject);
  });
}
