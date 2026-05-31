import ora from 'ora';
import { execCommand } from '../utils/shell.js';
import { t, icons } from '../ui/theme.js';
import { errorDisplay } from '../ui/components.js';

export interface CoralSource {
  name: string;
  connected: boolean;
}

/**
 * Discover all available Coral sources.
 * Runs: coral source discover
 */
export async function discoverSources(): Promise<CoralSource[]> {
  const spinner = ora({
    text: t.dim('Discovering available sources...'),
    color: 'cyan',
  }).start();

  const result = execCommand('coral source discover');

  if (result.exitCode !== 0) {
    spinner.fail(t.error('Failed to discover sources'));
    if (result.stderr) {
      errorDisplay(result.stderr);
    }
    return [];
  }

  spinner.succeed(t.success('Sources discovered'));

  // Parse the output from coral source discover
  // The exact format depends on Coral's output — we parse line by line
  const lines = result.stdout.split('\n').filter(Boolean);
  const sources: CoralSource[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('─') || trimmed.startsWith('=')) continue;

    // Try to extract source name from various possible formats
    // Coral may output: "github", "• github", "  github  (connected)", etc.
    const cleaned = trimmed
      .replace(/^[•\-\*\>]\s*/, '')  // Remove bullet prefixes
      .replace(/\s*\(.*\)\s*$/, '')   // Remove parenthetical notes
      .trim();

    if (cleaned && !cleaned.includes(' ') && cleaned.length < 30) {
      sources.push({ name: cleaned, connected: false });
    } else if (cleaned) {
      // Try to extract just the first word as source name
      const firstName = cleaned.split(/\s+/)[0];
      if (firstName && firstName.length < 30) {
        sources.push({ name: firstName, connected: false });
      }
    }
  }

  return sources;
}

/**
 * Get the list of currently connected/configured sources.
 * Attempts to determine which sources have been added.
 */
export async function getConnectedSources(): Promise<string[]> {
  // Query coral.tables to see which sources are currently accessible
  const result = execCommand('coral sql "SELECT DISTINCT schema_name FROM coral.tables"');

  if (result.exitCode !== 0) {
    return [];
  }

  const lines = result.stdout.split('\n').filter(Boolean);
  const sources: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip header lines, dividers, and the 'coral' schema itself
    if (
      !trimmed ||
      trimmed.startsWith('─') ||
      trimmed.startsWith('+') ||
      trimmed === 'schema_name' ||
      trimmed === 'coral'
    ) {
      continue;
    }

    // Extract schema name, handling possible table-formatted output
    const cleaned = trimmed.replace(/[│|]/g, '').trim();
    if (cleaned && cleaned !== 'schema_name' && cleaned !== 'coral') {
      sources.push(cleaned);
    }
  }

  return sources;
}

/**
 * Get detailed table information for a given source.
 */
export async function getSourceTables(sourceName: string): Promise<string[]> {
  const result = execCommand(
    `coral sql "SELECT table_name FROM coral.tables WHERE schema_name = '${sourceName}'"`
  );

  if (result.exitCode !== 0) {
    return [];
  }

  const lines = result.stdout.split('\n').filter(Boolean);
  const tables: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('─') ||
      trimmed.startsWith('+') ||
      trimmed === 'table_name'
    ) {
      continue;
    }
    const cleaned = trimmed.replace(/[│|]/g, '').trim();
    if (cleaned && cleaned !== 'table_name') {
      tables.push(cleaned);
    }
  }

  return tables;
}

/**
 * Get column information for a specific table.
 */
export async function getTableColumns(
  sourceName: string,
  tableName: string
): Promise<Array<{ name: string; type: string }>> {
  const result = execCommand(
    `coral sql "SELECT column_name, data_type FROM coral.columns WHERE schema_name = '${sourceName}' AND table_name = '${tableName}'"`
  );

  if (result.exitCode !== 0) {
    return [];
  }

  const lines = result.stdout.split('\n').filter(Boolean);
  const columns: Array<{ name: string; type: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('─') ||
      trimmed.startsWith('+') ||
      trimmed === 'column_name'
    ) {
      continue;
    }
    const parts = trimmed.replace(/[│|]/g, ' ').trim().split(/\s{2,}/);
    if (parts.length >= 2 && parts[0] !== 'column_name') {
      columns.push({ name: parts[0].trim(), type: parts[1].trim() });
    }
  }

  return columns;
}
