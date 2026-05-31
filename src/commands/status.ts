import ora from 'ora';
import { detectCoral } from '../coral/detect.js';
import { getConnectedSources, getSourceTables } from '../coral/sources.js';
import { t, icons, divider, g } from '../ui/theme.js';
import { renderMiniSplash } from '../ui/splash.js';
import { sectionHeader, badge, errorDisplay } from '../ui/components.js';
import boxen from 'boxen';

export async function statusCommand(options: { verbose?: boolean }): Promise<void> {
  renderMiniSplash();

  // Verify Coral
  const coral = detectCoral();
  if (!coral.installed) {
    errorDisplay(
      'Coral CLI is not installed.',
      'Run: brew install withcoral/tap/coral'
    );
    process.exit(1);
  }

  console.log(`  ${t.dim('Coral')} ${badge(`v${coral.version}`, 'success')}`);
  console.log('');

  const spinner = ora({
    text: t.dim('Fetching connected sources...'),
    color: 'cyan',
    indent: 2,
  }).start();

  const sources = await getConnectedSources();

  if (sources.length === 0) {
    spinner.warn(t.warning('No sources connected'));
    console.log('');
    console.log(`  ${t.dim('Connect your first source:')}`);
    console.log(`  ${t.primary('polyp connect github')}`);
    console.log(`  ${t.primary('polyp connect slack')}`);
    console.log(`  ${t.primary('polyp connect linear')}`);
    console.log('');
    return;
  }

  spinner.succeed(t.success(`${sources.length} source${sources.length > 1 ? 's' : ''} connected`));
  console.log('');

  sectionHeader('Connected Sources', icons.plug);

  for (const source of sources) {
    console.log(`    ${icons.check}  ${t.bold(source)}`);

    if (options.verbose) {
      const tables = await getSourceTables(source);
      if (tables.length > 0) {
        for (const table of tables) {
          console.log(`       ${icons.chevron}  ${t.dim(table)}`);
        }
      }
    }
  }

  console.log('');

  if (!options.verbose) {
    console.log(t.dim('  Run polyp status --verbose for table details'));
    console.log('');
  }
}
