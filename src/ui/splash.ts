import boxen from 'boxen';
import { g, t, icons, divider } from './theme.js';

const LOGO_LINES = [
  '  ██████╗  ██████╗ ██╗  ██╗   ██╗██████╗ ',
  '  ██╔══██╗██╔═══██╗██║  ╚██╗ ██╔╝██╔══██╗',
  '  ██████╔╝██║   ██║██║   ╚████╔╝ ██████╔╝',
  '  ██╔═══╝ ██║   ██║██║    ╚██╔╝  ██╔═══╝ ',
  '  ██║     ╚██████╔╝███████╗██║   ██║     ',
  '  ╚═╝      ╚═════╝ ╚══════╝╚═╝   ╚═╝     ',
];

export function renderSplash(): void {
  const logo = LOGO_LINES.map((line) => g.brand(line)).join('\n');

  const tagline = [
    '',
    t.dim('    Organizational Intelligence'),
    t.dim('    Powered by ') + t.coral('Coral') + t.dim(' ') + icons.coral,
    '',
  ].join('\n');

  const content = logo + tagline;

  console.log('');
  console.log(
    boxen(content, {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: '#00D4AA',
      dimBorder: true,
    })
  );
}

export function renderMiniSplash(): void {
  console.log('');
  console.log(g.brand('  ◆ POLYP'));
  console.log(t.dim('  Organizational Intelligence'));
  console.log('');
}

export function renderVersion(version: string): void {
  console.log(t.dim(`  v${version}`));
}

export function renderWelcome(): void {
  renderSplash();
  console.log('');
  console.log(t.dim('  Type ') + t.primary('polyp --help') + t.dim(' to see available commands'));
  console.log(t.dim('  Type ') + t.primary('polyp chat') + t.dim(' to start investigating'));
  console.log('');
}
