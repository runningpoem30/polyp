import chalk from 'chalk';
import gradient from 'gradient-string';

// ── Color Palette ──────────────────────────────────────────────
export const colors = {
  primary:    '#00D4AA',
  secondary:  '#7B61FF',
  accent:     '#FF6B6B',
  coral:      '#FF7F50',
  ocean:      '#00B4D8',
  gold:       '#FFB347',
  surface:    '#1E1E2E',
  text:       '#CDD6F4',
  subtext:    '#A6ADC8',
  muted:      '#6C7086',
  overlay:    '#313244',
} as const;

// ── Styled Text Helpers ────────────────────────────────────────
export const t = {
  // Brand
  primary:   chalk.hex(colors.primary),
  secondary: chalk.hex(colors.secondary),
  accent:    chalk.hex(colors.accent),
  coral:     chalk.hex(colors.coral),
  ocean:     chalk.hex(colors.ocean),
  gold:      chalk.hex(colors.gold),

  // Semantic
  success: chalk.hex(colors.primary),
  warning: chalk.hex(colors.gold),
  error:   chalk.hex(colors.accent),
  info:    chalk.hex('#64B5F6'),

  // Typography
  heading:  chalk.bold.white,
  subhead:  chalk.hex(colors.subtext),
  label:    chalk.hex(colors.subtext),
  text:     chalk.hex(colors.text),
  dim:      chalk.hex(colors.muted),
  bold:     chalk.bold.white,
  muted:    chalk.dim,
  link:     chalk.hex(colors.ocean).underline,
} as const;

// ── Gradients ──────────────────────────────────────────────────
export const g = {
  brand: gradient([colors.primary, colors.ocean, colors.secondary]),
  warm:  gradient([colors.coral, colors.accent, colors.secondary]),
  cool:  gradient([colors.primary, colors.ocean]),
  fire:  gradient([colors.gold, colors.coral, colors.accent]),
  mono:  gradient(['#CDD6F4', '#6C7086']),
} as const;

// ── Icons ──────────────────────────────────────────────────────
export const icons = {
  check:    t.success('✓'),
  cross:    t.error('✗'),
  arrow:    t.primary('→'),
  chevron:  t.primary('›'),
  dot:      t.dim('·'),
  bullet:   t.primary('•'),
  star:     t.gold('★'),
  warn:     t.warning('⚠'),
  info:     t.info('ℹ'),
  search:   '🔍',
  brain:    '🧠',
  coral:    '🪸',
  link:     '🔗',
  person:   '👤',
  code:     '💻',
  chat:     '💬',
  lock:     '🔒',
  rocket:   '🚀',
  shield:   '🛡️',
  plug:     '🔌',
  chart:    '📊',
  book:     '📖',
  folder:   '📁',
  magnify:  '🔎',
  bolt:     '⚡',
  sparkles: '✨',
} as const;

// ── Layout Helpers ─────────────────────────────────────────────
export const divider = (width = 50): string =>
  t.dim('─'.repeat(width));

export const thinDivider = (width = 50): string =>
  t.dim('╌'.repeat(width));

export const spacer = (lines = 1): string =>
  '\n'.repeat(lines);

export const indent = (text: string, spaces = 2): string =>
  text.split('\n').map((line) => ' '.repeat(spaces) + line).join('\n');

export const pad = (text: string, width: number): string =>
  text + ' '.repeat(Math.max(0, width - stripAnsi(text).length));

// ── Utility ────────────────────────────────────────────────────
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[\d+m/g, '').replace(/\x1B\[[0-9;]*m/g, '');
}
