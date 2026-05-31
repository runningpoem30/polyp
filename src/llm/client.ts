import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getLLMConfig, type LLMConfig } from '../config/store.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Send messages to the configured LLM and get a response.
 */
export async function chat(messages: LLMMessage[]): Promise<LLMResponse> {
  const config = getLLMConfig();

  if (!config.apiKey) {
    throw new Error(
      'LLM API key not configured. Run: polyp config'
    );
  }

  if (config.provider === 'anthropic') {
    return chatAnthropic(messages, config);
  }
  if (config.provider === 'gemini') {
    return chatGemini(messages, config);
  }
  return chatOpenAI(messages, config);
}

async function chatGemini(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  const systemMsg = messages.find((m) => m.role === 'system');
  const history = messages.filter((m) => m.role !== 'system');

  const model = config.model || 'gemini-2.5-flash';
  
  // Convert roles
  const geminiContents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: model,
    contents: geminiContents,
    config: {
      systemInstruction: systemMsg ? systemMsg.content : undefined,
      temperature: 0.3,
    }
  });

  return {
    content: response.text ?? '',
    model: model,
    usage: response.usageMetadata
      ? {
          inputTokens: response.usageMetadata.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
        }
      : undefined,
  };
}

async function chatOpenAI(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const client = new OpenAI({ apiKey: config.apiKey });

  const response = await client.chat.completions.create({
    model: config.model || 'gpt-4o',
    messages: messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    temperature: 0.3,
    max_tokens: 4096,
  });

  const choice = response.choices[0];
  return {
    content: choice?.message?.content ?? '',
    model: response.model,
    usage: response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        }
      : undefined,
  };
}

async function chatAnthropic(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const client = new Anthropic({ apiKey: config.apiKey });

  // Extract system message
  const systemMsg = messages.find((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  const response = await client.messages.create({
    model: config.model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemMsg?.content ?? '',
    messages: nonSystemMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return {
    content: textBlock?.text ?? '',
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
