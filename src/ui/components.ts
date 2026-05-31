import boxen from 'boxen';
import chalk from 'chalk';
import { t, g, icons, divider, indent } from './theme.js';

// ── Section Header ─────────────────────────────────────────────
export function sectionHeader(title: string, icon?: string): void {
  console.log('');
  const prefix = icon ? `${icon}  ` : '';
  console.log(`  ${prefix}${t.heading(title)}`);
  console.log(`  ${divider(40)}`);
}

// ── Key-Value Display ──────────────────────────────────────────
export function keyValue(key: string, value: string, indentLevel = 4): void {
  console.log(' '.repeat(indentLevel) + t.label(key + ':') + '  ' + t.text(value));
}

// ── Source List ─────────────────────────────────────────────────
export interface SourceInfo {
  name: string;
  connected: boolean;
  description?: string;
}

export function sourceList(sources: SourceInfo[]): void {
  for (const source of sources) {
    const icon = source.connected ? icons.check : t.dim('○');
    const name = source.connected ? t.text(source.name) : t.dim(source.name);
    const desc = source.description ? t.dim(`  ${source.description}`) : '';
    console.log(`    ${icon}  ${name}${desc}`);
  }
}

// ── Status Badge ───────────────────────────────────────────────
export function badge(label: string, variant: 'success' | 'warning' | 'error' | 'info' = 'info'): string {
  const colorFn = {
    success: t.success,
    warning: t.warning,
    error: t.error,
    info: t.info,
  }[variant];
  return colorFn(`[${label}]`);
}

// ── Evidence Card ──────────────────────────────────────────────
export interface Evidence {
  source: string;
  title: string;
  url?: string;
  snippet?: string;
  relevance?: number;
}

export function evidenceCard(evidence: Evidence): void {
  const sourceTag = t.ocean(`[${evidence.source}]`);
  console.log(`    ${sourceTag}  ${t.bold(evidence.title)}`);
  if (evidence.url) {
    console.log(`           ${t.link(evidence.url)}`);
  }
  if (evidence.snippet) {
    console.log(`           ${t.dim(evidence.snippet)}`);
  }
  if (evidence.relevance !== undefined) {
    const pct = Math.round(evidence.relevance * 100);
    console.log(`           ${t.dim('Relevance:')} ${t.primary(`${pct}%`)}`);
  }
  console.log('');
}

// ── Investigation Summary Box ──────────────────────────────────
export interface InvestigationResult {
  answer: string;
  confidence: number;
  evidences: Evidence[];
  experts: string[];
  recommendedReading: string[];
}

export function investigationBox(result: InvestigationResult): void {
  const confPct = Math.round(result.confidence * 100);
  const confColor = confPct >= 80 ? t.success : confPct >= 50 ? t.warning : t.error;

  const content = [
    '',
    `  ${t.heading('Summary')}`,
    `  ${divider(44)}`,
    `  ${t.text(result.answer)}`,
    '',
    `  ${t.heading('Evidence Found')}  ${t.dim(`(${result.evidences.length} sources)`)}`,
    `  ${divider(44)}`,
    ...result.evidences.map(
      (e) => `  ${icons.bullet}  ${t.ocean(`[${e.source}]`)} ${e.title}`
    ),
    '',
    ...(result.experts.length > 0
      ? [
          `  ${t.heading('Experts Identified')}`,
          `  ${divider(44)}`,
          ...result.experts.map((e) => `  ${icons.person}  ${t.text(e)}`),
          '',
        ]
      : []),
    ...(result.recommendedReading.length > 0
      ? [
          `  ${t.heading('Recommended Reading')}`,
          `  ${divider(44)}`,
          ...result.recommendedReading.map((r) => `  ${icons.book}  ${t.link(r)}`),
          '',
        ]
      : []),
    `  ${t.label('Confidence')}  ${confColor(`${confPct}%`)}`,
    '',
  ].join('\n');

  console.log(
    boxen(content, {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: '#00D4AA',
      dimBorder: true,
      title: `${icons.magnify}  Investigation Results`,
      titleAlignment: 'left',
    })
  );
}

// ── Info Box ────────────────────────────────────────────────────
export function infoBox(title: string, lines: string[]): void {
  const content = ['', ...lines.map((l) => `  ${l}`), ''].join('\n');
  console.log(
    boxen(content, {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: '#6C7086',
      dimBorder: true,
      title: title,
      titleAlignment: 'left',
    })
  );
}

// ── Error Display ──────────────────────────────────────────────
export function errorDisplay(message: string, suggestion?: string): void {
  console.log('');
  console.log(`  ${icons.cross}  ${t.error(message)}`);
  if (suggestion) {
    console.log(`     ${t.dim(suggestion)}`);
  }
  console.log('');
}

// ── Success Display ────────────────────────────────────────────
export function successDisplay(message: string): void {
  console.log('');
  console.log(`  ${icons.check}  ${t.success(message)}`);
  console.log('');
}
