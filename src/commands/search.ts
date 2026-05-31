import ora from 'ora';
import boxen from 'boxen';
import { detectCoral } from '../coral/detect.js';
import { getConnectedSources, getTableColumns, getSourceTables } from '../coral/sources.js';
import { executeQuery } from '../coral/query.js';
import { t, icons, divider } from '../ui/theme.js';
import { renderMiniSplash } from '../ui/splash.js';
import { sectionHeader, errorDisplay, badge } from '../ui/components.js';

export async function searchCommand(term: string): Promise<void> {
  renderMiniSplash();

  // Pre-flight checks
  const coral = detectCoral();
  if (!coral.installed) {
    errorDisplay('Coral CLI is not installed.', 'Run: brew install withcoral/tap/coral');
    process.exit(1);
  }

  const sources = await getConnectedSources();
  if (sources.length === 0) {
    errorDisplay('No sources connected.', 'Run: polyp connect github');
    process.exit(1);
  }

  console.log('');
  console.log(
    boxen(
      `\n  ${icons.search}  ${t.heading('Global Search')}\n\n  ${t.dim('Term:')} ${t.primary(term)}\n`,
      {
        borderStyle: 'round',
        borderColor: '#00B4D8',
        dimBorder: true,
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
      }
    )
  );

  const spinner = ora({
    text: t.dim('Searching across connected sources...'),
    color: 'cyan',
    indent: 2,
  }).start();

  let totalResults = 0;
  const safeTerm = term.replace(/'/g, "''");

  for (const source of sources) {
    const tables = await getSourceTables(source);
    for (const table of tables) {
      const columns = await getTableColumns(source, table);
      // Filter for text-like columns to search against
      const textColumns = columns.filter((c) => 
        c.type.toLowerCase().includes('text') || 
        c.type.toLowerCase().includes('string') || 
        c.type.toLowerCase().includes('varchar') ||
        c.type.toLowerCase() === 'boolean' === false // Fallback: just avoid obvious non-texts if types are vague
      );

      if (textColumns.length === 0) continue;

      const conditions = textColumns.map(c => `CAST(${c.name} AS TEXT) ILIKE '%${safeTerm}%'`).join(' OR ');
      const sql = `SELECT * FROM ${source}.${table} WHERE ${conditions} LIMIT 5`;

      const result = executeQuery(sql);

      if (result.success && result.rowCount && result.rowCount > 0) {
        spinner.stop();
        console.log('');
        console.log(`  ${icons.folder}  ${t.ocean(`[${source}.${table}]`)}  ${badge(`${result.rowCount} matches`, 'success')}`);
        console.log(`  ${divider(60)}`);
        
        // Print actual raw data output
        const lines = result.data.split('\n');
        for (const line of lines) {
            console.log(`    ${t.dim(line)}`);
        }
        console.log('');
        spinner.start();
        totalResults += result.rowCount;
      }
    }
  }

  if (totalResults === 0) {
    spinner.info(t.dim(`No results found for "${term}" across ${sources.length} sources.`));
  } else {
    spinner.succeed(t.success(`Found ${totalResults} results across all sources.`));
  }
  console.log('');
}
