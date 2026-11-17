import Anthropic from '@anthropic-ai/sdk';
import type { DraftUsage } from '../shared/aiDraft';
import type { Prompt } from './aiPrompt';

export type AiUsage = DraftUsage;

/** Клиент модели за интерфейсом: в тестах — подделка, в сеть тесты не ходят. */
export interface AiClient {
  draft(prompt: Prompt, schema: Record<string, unknown>): Promise<{ json: unknown; usage: AiUsage }>;
}

export const AI_MODEL = 'claude-haiku-5-5';
/** output_config.effort; подбирать по логам (качество против времени ответа). https://platform.claude.com/docs/en/build-with-claude/effort */
export const AI_EFFORT = 'medium';
const TIMEOUT_MS = 60_000;
/** Вместе с размышлением; тренировка в JSON — 2–3 тыс. токенов */
const MAX_TOKENS = 16_000;

/** Ошибка модели без текста запроса и ответа: в лог попадают только status и message. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * Haiku 5.5 через @anthropic-ai/sdk, без стриминга, повторы SDK по умолчанию.
 * JSON строго по схеме — structured outputs (output_config.format, GA, поддерживается claude-haiku-5-5):
 * https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 * Размышление adaptive (у Haiku 5.5 включено по умолчанию), грамматика схемы действует только на ответ, не на размышление:
 * https://platform.claude.com/docs/en/build-with-claude/thinking
 */
export function anthropicClient(apiKey: string, opts: { fetch?: typeof globalThis.fetch; maxRetries?: number } = {}): AiClient {
  // opts — только для тестов: подставной fetch и без повторов
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, ...opts });
  return {
    async draft(prompt, schema) {
      let msg: Anthropic.Message;
      try {
        msg = await client.messages.create({
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'adaptive', display: 'omitted' },
          output_config: { effort: AI_EFFORT, format: { type: 'json_schema', schema } },
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
        });
      } catch (e) {
        if (e instanceof Anthropic.APIError) throw new AiError(e.message, e.status);
        throw new AiError(e instanceof Error ? e.message : 'unknown');
      }
      if (msg.stop_reason !== 'end_turn') throw new AiError(`stop_reason ${msg.stop_reason}`);
      const text = msg.content.find((b) => b.type === 'text');
      if (text?.type !== 'text') throw new AiError('нет текста в ответе');
      let json: unknown;
      try {
        json = JSON.parse(text.text);
      } catch {
        throw new AiError('ответ не JSON');
      }
      const u = msg.usage;
      return {
        json,
        usage: { input: u.input_tokens, cacheCreation: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens },
      };
    },
  };
}
