#!/usr/bin/env node

import { Command } from 'commander';
import { homeCommand } from './commands/home.js';
import { connectCommand } from './commands/connect.js';
import { statusCommand } from './commands/status.js';
import { chatCommand } from './commands/chat.js';
import { investigateCommand } from './commands/investigate.js';
import { configCommand } from './commands/config.js';
import { searchCommand } from './commands/search.js';
import { queryCommand } from './commands/query.js';
import { t, icons } from './ui/theme.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── Load package version ──────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let version = '0.1.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  version = pkg.version;
} catch {
  // fallback to hardcoded version
}

// ── CLI Program ───────────────────────────────────────────────────────
const program = new Command();

program
  .name('polyp')
  .description(
    `${icons.coral}  Polyp — AI-powered organizational intelligence\n` +
    `   Query your organization's knowledge across GitHub, Slack, Linear, and more.\n` +
    `   Powered by Coral.`
  )
  .version(version, '-v, --version', 'Display version')
  .action(async () => {
    await homeCommand();
  });

// ── connect ───────────────────────────────────────────────────────────
program
  .command('connect <source>')
  .description('Connect a data source via Coral (Supports ANY Coral-compatible source)')
  .addHelpText(
    'after',
    `
Note: Run '${t.primary('polyp sources')}' to see the full list of available integrations.

Examples:
  ${t.dim('$')} polyp connect github
  ${t.dim('$')} polyp connect slack
  ${t.dim('$')} polyp connect linear
  ${t.dim('$')} polyp connect notion
  ${t.dim('$')} polyp connect jira
  ${t.dim('$')} polyp connect sentry
`
  )
  .action(async (source: string) => {
    await connectCommand(source);
  });

// ── status ────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show connected sources and system health')
  .option('--verbose', 'Show table details for each source')
  .action(async (options: { verbose?: boolean }) => {
    await statusCommand(options);
  });

// ── config ────────────────────────────────────────────────────────────
program
  .command('config')
  .description('Configure LLM provider and API keys')
  .action(async () => {
    await configCommand();
  });

// ── chat ──────────────────────────────────────────────────────────────
program
  .command('chat')
  .description('Interactive chat — ask questions about your organization')
  .addHelpText(
    'after',
    `
Examples:
  ${t.dim('$')} polyp chat
  ${t.dim('Then ask:')} Have we solved OAuth timeout issues before?
  ${t.dim('Then ask:')} Who knows the most about GraphQL?
  ${t.dim('Then ask:')} What discussions happened about the payment migration?
`
  )
  .action(async () => {
    await chatCommand();
  });

// ── investigate ───────────────────────────────────────────────────────
program
  .command('investigate <topic>')
  .description('Deep investigation — generate a comprehensive report on a topic')
  .addHelpText(
    'after',
    `
Examples:
  ${t.dim('$')} polyp investigate "OAuth timeout"
  ${t.dim('$')} polyp investigate "payment migration"
  ${t.dim('$')} polyp investigate "service X documentation"
`
  )
  .action(async (topic: string) => {
    await investigateCommand(topic);
  });

// ── sources ───────────────────────────────────────────────────────────
program
  .command('sources')
  .description('Discover all available Coral sources')
  .action(async () => {
    const { renderMiniSplash } = await import('./ui/splash.js');
    const { discoverSources } = await import('./coral/sources.js');
    const { sectionHeader, sourceList } = await import('./ui/components.js');

    renderMiniSplash();
    const sources = await discoverSources();

    if (sources.length > 0) {
      sectionHeader('Available Sources', icons.plug);
      sourceList(sources);
    } else {
      console.log(`  ${t.dim('Could not discover sources. Is Coral installed?')}`);
    }
    console.log('');
  });

// ── search ────────────────────────────────────────────────────────────
program
  .command('search <term>')
  .description('Search for a term across all connected data sources (No AI required)')
  .action(async (term: string) => {
    await searchCommand(term);
  });

// ── context ───────────────────────────────────────────────────────────
program
  .command('context <action> [key] [value]')
  .description('Manage persistent context for the AI (set, list, clear)')
  .addHelpText(
    'after',
    `
Examples:
  ${t.dim('$')} polyp context set github_owner runningpoem30
  ${t.dim('$')} polyp context list
  ${t.dim('$')} polyp context clear github_owner
`
  )
  .action(async (action: string, key?: string, value?: string) => {
    const { contextCommand } = await import('./commands/context.js');
    await contextCommand(action, key, value);
  });

// ── query ─────────────────────────────────────────────────────────────
program
  .command('query <sql>')
  .description('Run a raw SQL query directly against Coral (No AI required)')
  .action(async (sql: string) => {
    await queryCommand(sql);
  });

// ── Parse & Execute ───────────────────────────────────────────────────
program.parseAsync(process.argv).catch((err) => {
  console.error(t.error(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
