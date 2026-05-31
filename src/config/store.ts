import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CONFIG_DIR = join(homedir(), '.polyp');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model: string;
}

export interface PolypConfig {
  llm: LLMConfig;
  firstRun: boolean;
  connectedSources: string[];
  context: Record<string, string>;
}

const DEFAULT_CONFIG: PolypConfig = {
  llm: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
  },
  firstRun: true,
  connectedSources: [],
  context: {},
};

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): PolypConfig {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed, context: parsed.context || {} };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: PolypConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function updateConfig(partial: Partial<PolypConfig>): PolypConfig {
  const config = loadConfig();
  const updated = { ...config, ...partial };
  saveConfig(updated);
  return updated;
}

export function isLLMConfigured(): boolean {
  const config = loadConfig();
  return config.llm.apiKey.length > 0;
}

export function getLLMConfig(): LLMConfig {
  return loadConfig().llm;
}

export function getContext(): Record<string, string> {
  return loadConfig().context || {};
}

export function setContextValue(key: string, value: string): void {
  const config = loadConfig();
  config.context[key] = value;
  saveConfig(config);
}

export function clearContextValue(key: string): void {
  const config = loadConfig();
  delete config.context[key];
  saveConfig(config);
}
