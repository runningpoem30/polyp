import { execCommand } from './dist/utils/shell.js';
console.log(execCommand('coral sql "SELECT DISTINCT schema_name FROM coral.tables"'));
