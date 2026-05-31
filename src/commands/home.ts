import { renderSplash, renderWelcome } from '../ui/splash.js';
import { ensureCoral, detectCoral } from '../coral/detect.js';
import { getConnectedSources } from '../coral/sources.js';
import { isLLMConfigured, loadConfig } from '../config/store.js';
import { t, icons, divider } from '../ui/theme.js';
import { sectionHeader, badge } from '../ui/components.js';

export async function homeCommand(): Promise<void> {
  renderSplash();

  // Check Coral
  const coralStatus = await ensureCoral();
  if (!coralStatus.installed) {
    process.exit(1);
  }

  // Check connected sources
  const connectedSources = await getConnectedSources();
  const llmConfigured = isLLMConfigured();
  const config = loadConfig();

  console.log('');

  // Status overview
  sectionHeader('System Status', icons.chart);

  const coralBadge = badge(`Coral v${coralStatus.version}`, 'success');
  console.log(`    ${icons.check}  ${t.text('Coral CLI')}       ${coralBadge}`);

  if (connectedSources.length > 0) {
    console.log(
      `    ${icons.check}  ${t.text('Data Sources')}    ${badge(`${connectedSources.length} connected`, 'success')}`
    );
    for (const source of connectedSources) {
      console.log(`       ${icons.chevron}  ${t.dim(source)}`);
    }
  } else {
    console.log(
      `    ${icons.warn}  ${t.text('Data Sources')}    ${badge('none connected', 'warning')}`
    );
    console.log(`       ${t.dim('Run')} ${t.primary('polyp connect github')} ${t.dim('to get started')}`);
  }

  if (llmConfigured) {
    const provider = config.llm.provider === 'openai' ? 'OpenAI' : config.llm.provider === 'gemini' ? 'Gemini' : 'Anthropic';
    console.log(
      `    ${icons.check}  ${t.text('LLM (Optional)')}  ${badge(`${provider} (${config.llm.model})`, 'success')}`
    );
  } else {
    console.log(
      `    ${t.dim('○')}  ${t.dim('LLM (Optional)')}  ${badge('not configured', 'info')}`
    );
    console.log(`       ${t.dim('Run')} ${t.primary('polyp config')} ${t.dim('to enable AI features')}`);
  }

  // Quick start guide
  console.log('');
  sectionHeader('Quick Start', icons.rocket);
  console.log(`    ${t.primary('polyp connect <source>')}  ${t.dim('Connect a data source')}`);
  console.log(`    ${t.primary('polyp search <term>')}     ${t.dim('Search across all sources')}`);
  console.log(`    ${t.primary('polyp query "<sql>"')}     ${t.dim('Run a raw Coral SQL query')}`);
  console.log(`    ${t.primary('polyp chat')}              ${t.dim('AI chat (requires config)')}`);
  console.log(`    ${t.primary('polyp investigate ".."')}  ${t.dim('Deep AI investigation (requires config)')}`);
  console.log('');
}
