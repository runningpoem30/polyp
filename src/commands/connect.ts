import ora from 'ora';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { execInteractive, execCommand } from '../utils/shell.js';
import { detectCoral } from '../coral/detect.js';
import { t, icons, divider } from '../ui/theme.js';
import { renderMiniSplash } from '../ui/splash.js';
import { errorDisplay, successDisplay, infoBox } from '../ui/components.js';

export async function connectCommand(sourceName: string): Promise<void> {
  renderMiniSplash();

  const coral = detectCoral();
  if (!coral.installed) {
    errorDisplay('Coral CLI is not installed.', 'Run: brew install withcoral/tap/coral');
    process.exit(1);
  }

  console.log(`  ${icons.plug}  ${t.heading('Connecting')} ${t.primary(sourceName)}`);
  console.log('');

  // Custom polished flow specifically for GitHub
  if (sourceName.toLowerCase() === 'github') {
    await handleGithubConnection();
  } else {
    // Fallback for other sources
    console.log(t.dim(`  Handing off to Coral's interactive setup for ${sourceName}...`));
    console.log('');
    
    try {
      const exitCode = await execInteractive('coral', ['source', 'add', '--interactive', sourceName]);
      if (exitCode === 0) {
        successDisplay(`${sourceName} connected successfully!`);
      } else {
        errorDisplay(`Failed to connect ${sourceName}.`);
      }
    } catch (err) {
      errorDisplay(`Connection error: ${err}`);
    }
  }
}

async function handleGithubConnection(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    infoBox('GitHub Authentication', [
      'We recommend using a Personal Access Token (PAT) to connect GitHub.',
      '1. Go to https://github.com/settings/tokens',
      '2. Click "Generate new token (classic)"',
      '3. Select the "repo" and "read:org" scopes',
      '4. Generate and copy the token (ghp_...)'
    ]);

    console.log('');
    console.log(`  ${t.text('How would you like to connect?')}`);
    console.log(`    ${t.primary('1')} ${t.dim('›')} Paste Personal Access Token ${t.dim('(Recommended)')}`);
    console.log(`    ${t.primary('2')} ${t.dim('›')} Advanced / OAuth ${t.dim('(Use Coral interactive wizard)')}`);
    console.log('');

    const choice = await rl.question(`  ${t.primary('Choice')} ${t.dim('[1/2]:')} `);

    if (choice.trim() === '1') {
      console.log('');
      const token = await rl.question(`  ${t.primary('Paste your token')} ${t.dim('(ghp_...):')} `);
      
      if (!token.trim()) {
        errorDisplay('Token is required.');
        return;
      }

      console.log('');
      const spinner = ora({ text: t.dim('Authenticating with GitHub...'), color: 'cyan', indent: 2 }).start();
      
      // Execute non-interactively using env var
      const env = { ...process.env, GITHUB_TOKEN: token.trim() };
      // coral source add github non-interactively will read GITHUB_TOKEN
      import('node:child_process').then(({ execSync }) => {
        try {
          execSync('coral source add github', { stdio: 'pipe', env });
          spinner.succeed(t.success('GitHub connected successfully!'));
          console.log('');
          console.log(`  ${t.dim('Try:')} ${t.primary('polyp search "architecture"')}`);
          console.log('');
        } catch (err: any) {
          spinner.fail(t.error('Authentication failed'));
          const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
          errorDisplay('Could not connect to GitHub. Is your token valid?', output);
        }
      });
    } else {
      console.log('');
      console.log(t.dim('  Starting Coral advanced setup wizard...'));
      console.log(t.warning('  Important: If prompted, select "Paste token" or "OAuth app" properly.'));
      console.log('');
      
      rl.close(); // Need to close rl before passing stdin to child process
      
      const exitCode = await execInteractive('coral', ['source', 'add', '--interactive', 'github']);
      if (exitCode === 0) {
        successDisplay('GitHub connected successfully!');
      } else {
        errorDisplay('Failed to connect GitHub.');
      }
      return;
    }
  } finally {
    // Only close if we haven't already
    try { rl.close(); } catch (e) {}
  }
}
