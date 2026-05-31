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
  investigationBox,
  errorDisplay,
  badge,
  type Evidence,
  type InvestigationResult,
} from '../ui/components.js';
import boxen from 'boxen';

interface InvestigationPlan {
  investigationPlan: string;
  queries: Array<{
    category: string;
    purpose: string;
    sql: string;
  }>;
}

interface InvestigationSynthesis {
  answer: string;
  confidence: number;
  evidences: Evidence[];
  experts: string[];
  recommendedReading: string[];
  sourcesExamined: string[];
  documentsFound: number;
  discussionsFound: number;
  ticketsFound: number;
  codeChangesFound: number;
}

export async function investigateCommand(topic: string): Promise<void> {
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
    console.log(`     ${t.dim('The investigate command uses AI to perform deep research across your connected sources.')}`);
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

  console.log('');
  console.log(
    boxen(
      `\n  ${icons.magnify}  ${t.heading('Deep Investigation')}\n\n  ${t.dim('Topic:')} ${t.primary(topic)}\n`,
      {
        borderStyle: 'round',
        borderColor: '#7B61FF',
        dimBorder: true,
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
      }
    )
  );

  // Step 1: Build schema context
  const schemaSpinner = ora({
    text: t.dim('Loading organizational schema...'),
    color: 'cyan',
    indent: 2,
  }).start();

  const schemaContext = await buildSchemaContext();
  schemaSpinner.succeed(t.dim(`Schema loaded — ${sources.length} sources`));

  // Step 2: Generate investigation plan
  const planSpinner = ora({
    text: t.dim('Generating investigation plan...'),
    color: 'magenta',
    indent: 2,
  }).start();

  let plan: InvestigationPlan;
  try {
    const planMessages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPTS.investigator(schemaContext) },
      { role: 'user', content: `Investigate: ${topic}` },
    ];

    const planResponse = await llmChat(planMessages);
    plan = parseJSON<InvestigationPlan>(planResponse.content);
    planSpinner.succeed(t.dim(`Plan: ${plan.queries.length} queries across multiple categories`));
  } catch (err) {
    planSpinner.fail(t.error('Failed to generate investigation plan'));
    errorDisplay(err instanceof Error ? err.message : String(err));
    return;
  }

  // Step 3: Execute all queries with progress
  console.log('');
  sectionHeader('Executing Investigation', icons.search);

  const categoryResults: Map<string, string[]> = new Map();
  let completed = 0;

  for (const query of plan.queries) {
    completed++;
    const progress = t.dim(`[${completed}/${plan.queries.length}]`);
    const spinner = ora({
      text: `${progress} ${t.dim(query.category)} ${t.dim('›')} ${t.dim(query.purpose)}`,
      color: 'cyan',
      indent: 4,
    }).start();

    const result = executeQuery(query.sql);

    if (result.success && result.data && result.rowCount && result.rowCount > 0) {
      spinner.succeed(
        `${progress} ${t.text(query.category)} ${t.dim('›')} ${t.dim(query.purpose)} ${badge(`${result.rowCount} rows`, 'success')}`
      );

      const existing = categoryResults.get(query.category) ?? [];
      existing.push(`### ${query.purpose}\n${result.data}`);
      categoryResults.set(query.category, existing);
    } else if (result.success) {
      spinner.info(
        `${progress} ${t.dim(query.category)} ${t.dim('›')} ${t.dim(query.purpose)} ${badge('no results', 'info')}`
      );
    } else {
      spinner.warn(
        `${progress} ${t.dim(query.category)} ${t.dim('›')} ${t.dim(query.purpose)} ${badge('query error', 'warning')}`
      );
    }
  }

  // Step 4: Synthesize findings
  console.log('');
  const synthSpinner = ora({
    text: t.dim('Synthesizing investigation findings...'),
    color: 'magenta',
    indent: 2,
  }).start();

  try {
    const evidenceContext = Array.from(categoryResults.entries())
      .map(([category, results]) => `## ${category}\n${results.join('\n\n')}`)
      .join('\n\n---\n\n');

    const synthMessages: LLMMessage[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPTS.synthesizer}\n\nAdditionally, include these fields in your response:\n- "sourcesExamined": list of source names queried\n- "documentsFound": number of documents/pages found\n- "discussionsFound": number of discussions/messages found\n- "ticketsFound": number of tickets/issues found\n- "codeChangesFound": number of PRs/commits found`,
      },
      {
        role: 'user',
        content: `Investigation Topic: ${topic}\n\nEvidence gathered from ${categoryResults.size} categories across ${sources.length} data sources:\n\n${evidenceContext}`,
      },
    ];

    const synthResponse = await llmChat(synthMessages);
    const synthesis = parseJSON<InvestigationSynthesis>(synthResponse.content);

    synthSpinner.succeed(t.dim('Investigation complete'));
    console.log('');

    // Render investigation statistics
    sectionHeader('Investigation Statistics', icons.chart);
    console.log(`    ${t.label('Sources Examined')}    ${t.text(sources.join(', '))}`);
    console.log(`    ${t.label('Queries Executed')}    ${t.text(String(plan.queries.length))}`);
    console.log(`    ${t.label('Documents Found')}     ${t.text(String(synthesis.documentsFound ?? 0))}`);
    console.log(`    ${t.label('Discussions Found')}   ${t.text(String(synthesis.discussionsFound ?? 0))}`);
    console.log(`    ${t.label('Tickets Found')}       ${t.text(String(synthesis.ticketsFound ?? 0))}`);
    console.log(`    ${t.label('Code Changes Found')}  ${t.text(String(synthesis.codeChangesFound ?? 0))}`);
    console.log('');

    // Render full investigation results
    investigationBox({
      answer: synthesis.answer,
      confidence: synthesis.confidence,
      evidences: synthesis.evidences ?? [],
      experts: synthesis.experts ?? [],
      recommendedReading: synthesis.recommendedReading ?? [],
    });
  } catch (err) {
    synthSpinner.fail(t.error('Failed to synthesize findings'));
    errorDisplay(err instanceof Error ? err.message : String(err));
  }
}

function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error('Failed to parse LLM response as JSON');
  }
}
