import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import ora from 'ora';
import { detectCoral } from '../coral/detect.js';
import { getConnectedSources } from '../coral/sources.js';
import { executeQuery, buildSchemaContext } from '../coral/query.js';
import { chat as llmChat, type LLMMessage } from '../llm/client.js';
import { SYSTEM_PROMPTS } from '../llm/prompts.js';
import { isLLMConfigured } from '../config/store.js';
import { t, icons, divider, g } from '../ui/theme.js';
import { renderMiniSplash } from '../ui/splash.js';
import {
  sectionHeader,
  evidenceCard,
  errorDisplay,
  badge,
  type Evidence,
} from '../ui/components.js';
import boxen from 'boxen';

interface AgentAction {
  thought: string;
  action: 'query' | 'answer';
  sql?: string;
  answer?: string;
  confidence?: number;
  sources?: string[];
}

export async function chatCommand(): Promise<void> {
  renderMiniSplash();

  // Pre-flight checks
  const coral = detectCoral();
  if (!coral.installed) {
    errorDisplay('Coral CLI is not installed.', 'Run: brew install withcoral/tap/coral');
    process.exit(1);
  }

  if (!isLLMConfigured()) {
    console.log('');
    console.log(`  ${icons.warn}  ${t.warning('AI features are not configured.')}`);
    console.log(`     ${t.dim('The chat command translates natural language into Coral SQL queries using an LLM.')}`);
    console.log(`     ${t.dim('To enable this feature, run:')} ${t.primary('polyp config')}`);
    console.log('');
    console.log(`     ${t.dim('For direct retrieval without AI, use:')} ${t.primary('polyp search <term>')}`);
    console.log('');
    process.exit(1);
  }

  const sources = await getConnectedSources();
  if (sources.length === 0) {
    errorDisplay('No sources connected.', 'Run: polyp connect github');
    process.exit(1);
  }

  // Build schema context once
  const schemaSpinner = ora({
    text: t.dim('Loading schema from Coral...'),
    color: 'cyan',
    indent: 2,
  }).start();

  const schemaContext = await buildSchemaContext();
  schemaSpinner.succeed(t.dim(`Schema loaded — ${sources.length} sources available`));

  console.log('');
  console.log(
    `  ${icons.chat}  ${t.heading('Polyp Chat')}`
  );
  console.log(`  ${t.dim('Ask anything about your organization. Type')} ${t.primary('exit')} ${t.dim('to quit.')}`);
  console.log(`  ${divider(50)}`);
  console.log('');
  const conversationHistory: LLMMessage[] = [];
  const promptText = `  ${g.cool('Ask Polyp')} ${t.dim('›')} `;
  let shouldExit = false;

  while (!shouldExit) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    
    try {
      const question = await rl.question(promptText);
      const trimmed = question.trim();

      if (!trimmed) continue;
      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        console.log('');
        console.log(`  ${t.dim('Goodbye!')} ${icons.coral}`);
        console.log('');
        shouldExit = true;
        break;
      }

      await processQuestion(trimmed, schemaContext, conversationHistory);
    } finally {
      rl.close();
    }
  }
}

async function processQuestion(
  question: string,
  schemaContext: string,
  history: LLMMessage[]
): Promise<void> {
  const { getContext } = await import('../config/store.js');
  console.log('');

  const spinner = ora({
    text: t.dim('Thinking...'),
    color: 'cyan',
    indent: 2,
  }).start();

  const ctx = getContext();
  const persistentContextStr = Object.keys(ctx).length > 0 
    ? Object.entries(ctx).map(([k, v]) => `${k} = ${v}`).join('\n') 
    : '';

  // Initialize loop state
  const loopHistory: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS.agenticLoop(schemaContext, persistentContextStr) },
    ...history.slice(-4), // Context
    { role: 'user', content: question },
  ];

  let turns = 0;
  const maxTurns = 10;

  try {
    while (turns < maxTurns) {
      turns++;

      const response = await llmChat(loopHistory);
      const action = parseJSON<AgentAction>(response.content);

      if (action.action === 'query') {
        spinner.text = t.dim(`Strategy: ${action.thought}\n    ${icons.search} Querying Coral...`);
        
        const result = executeQuery(action.sql || '');
        
        loopHistory.push({ role: 'assistant', content: response.content });

        if (result.success) {
           loopHistory.push({ 
             role: 'user', 
             content: `[Observation: Query Success]\nResult:\n${result.data}\n\nWhat is your next action?` 
           });
        } else {
           loopHistory.push({ 
             role: 'user', 
             content: `[Observation: Query Failed]\nError:\n${result.error}\n\nAdjust your SQL and try again, or ask for help.` 
           });
           
           spinner.fail(t.error('Query failed'));
           console.log(`    ${icons.warn} ${t.dim(action.sql || '')}`);
           console.log(`    ${t.error(result.error || '')}`);
           console.log('');
           // Restart spinner for next thought
           spinner.start(t.dim('Thinking...'));
        }
      } else if (action.action === 'answer') {
        spinner.succeed(t.dim('Answer ready'));
        console.log('');
        renderAnswer(question, action);
        
        // Save only the final turn to main history to keep it clean
        history.push(
          { role: 'user', content: question },
          { role: 'assistant', content: action.answer || '' }
        );
        return;
      } else {
        spinner.fail(t.error('AI took an unknown action.'));
        return;
      }
    }

    spinner.fail(t.warning('Reached maximum iterations without a final answer.'));

  } catch (err) {
    spinner.fail(t.error('Agent loop encountered an error'));
    const msg = err instanceof Error ? err.message : String(err);
    errorDisplay(msg);
  }
}

function renderAnswer(question: string, result: AgentAction): void {
  const confPct = result.confidence || 0;
  const confColor = confPct >= 80 ? t.success : confPct >= 50 ? t.warning : t.error;

  const lines: string[] = [
    '',
    `  ${t.heading('Answer')}`,
    `  ${divider(44)}`,
    `  ${t.text(result.answer || 'No answer provided.')}`,
    '',
  ];

  if (result.sources && result.sources.length > 0) {
    lines.push(`  ${t.heading('Sources')}  ${t.dim(`(${result.sources.length} sources)`)}`);
    lines.push(`  ${divider(44)}`);
    for (const source of result.sources) {
      lines.push(`  ${icons.bullet}  ${t.dim(source)}`);
    }
    lines.push('');
  }

  lines.push(`  ${t.label('Confidence')}  ${confColor(`${confPct}%`)}`);
  lines.push('');

  const content = lines.join('\n');

  console.log(
    boxen(content, {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: '#00D4AA',
      dimBorder: true,
    })
  );
  console.log('');
}

function parseJSON<T>(text: string): T {
  // Extract JSON from potential markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find any JSON object in the text
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error('Failed to parse LLM response as JSON');
  }
}
