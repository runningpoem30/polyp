import { detectCoral } from '../coral/detect.js';
import { executeQuery } from '../coral/query.js';
import { t, icons } from '../ui/theme.js';
import { errorDisplay, successDisplay, badge } from '../ui/components.js';

export async function queryCommand(sql: string): Promise<void> {
  const coral = detectCoral();
  if (!coral.installed) {
    errorDisplay('Coral CLI is not installed.', 'Run: brew install withcoral/tap/coral');
    process.exit(1);
  }

  const result = executeQuery(sql);

  if (!result.success) {
    errorDisplay('Query failed', result.error);
    process.exit(1);
  }

  console.log('');
  const lines = result.data.split('\n');
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log('');
  
  if (result.rowCount !== undefined) {
    console.log(`  ${badge(`${result.rowCount} rows`, 'success')}  ${t.dim('executed via Coral')}`);
  }
  console.log('');
}
