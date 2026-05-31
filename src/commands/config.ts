import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { loadConfig, saveConfig, type PolypConfig } from '../config/store.js';
import { t, icons, g } from '../ui/theme.js';
import { renderMiniSplash } from '../ui/splash.js';
import { sectionHeader, successDisplay, badge } from '../ui/components.js';

export async function configCommand(): Promise<void> {
  renderMiniSplash();
  sectionHeader('Configuration', icons.lock);

  const config = loadConfig();
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    // Provider selection
    console.log('');
    console.log(`  ${t.text('Select LLM provider:')}`);
    console.log(`    ${t.primary('1')} ${t.dim('›')} OpenAI  ${t.dim('(gpt-4o, gpt-4o-mini)')}`);
    console.log(`    ${t.primary('2')} ${t.dim('›')} Anthropic  ${t.dim('(claude-sonnet, claude-opus)')}`);
    console.log(`    ${t.primary('3')} ${t.dim('›')} Gemini  ${t.dim('(gemini-2.5-flash, gemini-2.5-pro)')}`);
    console.log('');

    const providerChoice = await rl.question(`  ${t.primary('Choice')} ${t.dim('[1/2/3]:')} `);
    let provider = 'openai';
    if (providerChoice.trim() === '2') provider = 'anthropic';
    if (providerChoice.trim() === '3') provider = 'gemini';

    // API key
    console.log('');
    let keyPrompt = `  ${t.primary('OpenAI API Key')} ${t.dim('(sk-...):')}`;
    if (provider === 'anthropic') keyPrompt = `  ${t.primary('Anthropic API Key')} ${t.dim('(sk-ant-...):')}`;
    if (provider === 'gemini') keyPrompt = `  ${t.primary('Gemini API Key')} ${t.dim('(AIzaSy...):')}`;

    const apiKey = await rl.question(`${keyPrompt} `);

    if (!apiKey.trim()) {
      console.log(`  ${icons.cross}  ${t.error('API key is required')}`);
      rl.close();
      return;
    }

    // Model selection
    console.log('');
    let modelOptions: string[];
    if (provider === 'openai') {
      modelOptions = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
    } else if (provider === 'anthropic') {
      modelOptions = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'];
    } else {
      modelOptions = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    }

    console.log(`  ${t.text('Select model:')}`);
    modelOptions.forEach((m, i) => {
      const isDefault = i === 0;
      console.log(
        `    ${t.primary(String(i + 1))} ${t.dim('›')} ${m}${isDefault ? t.dim(' (recommended)') : ''}`
      );
    });
    console.log('');

    const modelChoice = await rl.question(`  ${t.primary('Choice')} ${t.dim(`[1-${modelOptions.length}]:`)} `);
    const modelIndex = parseInt(modelChoice.trim(), 10) - 1;
    const model = modelOptions[modelIndex] ?? modelOptions[0];

    // Save config
    const updated: PolypConfig = {
      ...config,
      llm: {
        provider: provider as 'openai' | 'anthropic' | 'gemini',
        apiKey: apiKey.trim(),
        model,
      },
    };

    saveConfig(updated);

    console.log('');
    successDisplay('Configuration saved!');
    const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
    console.log(`  ${t.label('Provider')}  ${t.text(providerName)}`);
    console.log(`  ${t.label('Model')}     ${t.text(model)}`);
    console.log(`  ${t.label('API Key')}   ${t.dim('••••' + apiKey.slice(-4))}`);
    console.log('');
    console.log(`  ${t.dim('You\'re all set! Try:')} ${t.primary('polyp chat')}`);
    console.log('');
  } finally {
    rl.close();
  }
}
