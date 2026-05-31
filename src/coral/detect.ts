import ora from 'ora';
import { execCommand } from '../utils/shell.js';
import { t, icons, g } from '../ui/theme.js';
import { infoBox, errorDisplay } from '../ui/components.js';
import { platform } from 'node:os';

export interface CoralStatus {
  installed: boolean;
  version?: string;
  error?: string;
}

/**
 * Check if the Coral CLI is installed and return its version.
 * Runs: coral --version
 */
export function detectCoral(): CoralStatus {
  const result = execCommand('coral --version');

  if (result.exitCode === 0 && result.stdout) {
    // Parse version from output
    const versionMatch = result.stdout.match(/\d+\.\d+\.\d+/);
    return {
      installed: true,
      version: versionMatch ? versionMatch[0] : result.stdout.trim(),
    };
  }

  return {
    installed: false,
    error: result.stderr || 'Coral CLI not found in PATH',
  };
}

/**
 * Display Coral detection result with install instructions if missing.
 */
export async function ensureCoral(): Promise<CoralStatus> {
  const spinner = ora({
    text: t.dim('Checking for Coral CLI...'),
    color: 'cyan',
  }).start();

  // Small delay for visual polish
  await new Promise((r) => setTimeout(r, 600));

  const status = detectCoral();

  if (status.installed) {
    spinner.succeed(t.success(`Coral CLI detected`) + t.dim(` (v${status.version})`));
    return status;
  }

  spinner.fail(t.error('Coral CLI not found'));
  console.log('');

  const os = platform();
  const instructions: string[] = [];

  if (os === 'darwin') {
    instructions.push(
      t.heading('Install Coral on macOS:'),
      '',
      `  ${t.primary('brew install withcoral/tap/coral')}`,
      '',
      t.dim('Then restart your terminal and run polyp again.'),
    );
  } else if (os === 'linux') {
    instructions.push(
      t.heading('Install Coral on Linux:'),
      '',
      `  ${t.primary('curl -fsSL https://withcoral.com/install.sh | sh')}`,
      '',
      t.dim('Then restart your terminal and run polyp again.'),
    );
  } else if (os === 'win32') {
    instructions.push(
      t.heading('Install Coral on Windows:'),
      '',
      `  Visit ${t.link('https://withcoral.com')} for installation instructions.`,
      '',
      t.dim('Then restart your terminal and run polyp again.'),
    );
  } else {
    instructions.push(
      t.heading('Install Coral:'),
      '',
      `  Visit ${t.link('https://withcoral.com')} for installation instructions.`,
    );
  }

  infoBox(`${icons.coral}  Coral Required`, instructions);

  return status;
}
