import { execCommand } from '../utils/shell.js';

export interface QueryResult {
  success: boolean;
  data: string;
  error?: string;
  rowCount?: number;
}

/**
 * Execute a SQL query via Coral CLI.
 * Runs: coral sql "<query>"
 */
export function executeQuery(sql: string): QueryResult {
  // Escape double quotes in the SQL for shell safety
  const escapedSql = sql.replace(/"/g, '\\"');
  const result = execCommand(`coral sql "${escapedSql}"`);

  if (result.exitCode !== 0) {
    return {
      success: false,
      data: '',
      error: result.stderr || 'Query execution failed',
    };
  }

  // Attempt to count data rows (excluding headers/dividers)
  const lines = result.stdout.split('\n').filter(Boolean);
  const dataLines = lines.filter(
    (l) =>
      !l.trim().startsWith('─') &&
      !l.trim().startsWith('+') &&
      !l.trim().startsWith('=') &&
      l.trim().length > 0
  );
  // Subtract 1 for the header row
  const rowCount = Math.max(0, dataLines.length - 1);

  return {
    success: true,
    data: result.stdout,
    rowCount,
  };
}

/**
 * Execute multiple SQL queries and return all results.
 */
export function executeQueries(queries: string[]): QueryResult[] {
  return queries.map((sql) => executeQuery(sql));
}

/**
 * Build the schema context string from connected sources.
 * This is sent to the LLM so it knows what tables/columns are available.
 */
export async function buildSchemaContext(): Promise<string> {
  const tablesResult = executeQuery(
    'SELECT schema_name, table_name, required_filters FROM coral.tables ORDER BY schema_name, table_name'
  );

  if (!tablesResult.success) {
    return 'No schema information available.';
  }

  const columnsResult = executeQuery(
    'SELECT schema_name, table_name, column_name, data_type, is_required_filter FROM coral.columns ORDER BY schema_name, table_name, column_name'
  );

  const lines: string[] = [
    '## Available Data Sources (Coral SQL Schema)',
    '',
    '### Tables',
    tablesResult.data,
    '',
  ];

  if (columnsResult.success) {
    lines.push('### Columns', columnsResult.data, '');
  }

  return lines.join('\n');
}

/**
 * Test if a basic Coral query works.
 */
export function testCoralQuery(): boolean {
  const result = executeQuery('SELECT 1 AS health_check');
  return result.success;
}
