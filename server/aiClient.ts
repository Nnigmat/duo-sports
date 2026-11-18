import Anthropic from '@anthropic-ai/sdk';
import type { DraftUsage } from '../shared/aiDraft';
import type { Prompt } from './aiPrompt';

/** Клиент модели за интерфейсом: в тестах — подделка, в сеть тесты не ходят. */
export interface AiClient {
  draft(prompt: Prompt, schema: Record<string, unknown>): Promise<{ json: unknown; usage: DraftUsage }>;
}

export const AI_MODEL = 'claude-haiku-5-5';
/**
 * Самая дешёвая настройка: Haiku 5.5 — самая дешёвая модель ($0,10 / $0,50 за млн токенов ввода / вывода, ноябрь 2026),
 * размышление выключено, effort low. С размышлением (adaptive, medium) ответ на длинное описание — 8–14 тыс. токенов
 * и 35–60 с, без него — 2–3,6 тыс. и 7–17 с; доля ответов, которые разбирает импорт, в замере не упала.
 * Размышление у Haiku 5.5 выключается только при effort не выше high.
 * https://platform.claude.com/docs/en/about-claude/pricing, https://platform.claude.com/docs/en/build-with-claude/effort
 */
const AI_EFFORT = 'low';
/** Ответ без размышления — до 20 с; обрыв по таймауту оплачивается, поэтому без повторов SDK: повторяет тренер кнопкой */
const TIMEOUT_MS = 60_000;
/** Тренировка в JSON — 2–3,6 тыс. токенов; потолок с запасом и против разгона стоимости */
const MAX_TOKENS = 8_000;

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
 * Haiku 5.5 через @anthropic-ai/sdk, без стриминга и без повторов SDK.
 * JSON строго по схеме — structured outputs (output_config.format, GA, поддерживается claude-haiku-5-5):
 * https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 * Размышление у Haiku 5.5 по умолчанию adaptive, здесь выключено: https://platform.claude.com/docs/en/build-with-claude/thinking
 */
export function anthropicClient(apiKey: string, opts: { fetch?: typeof globalThis.fetch; maxRetries?: number; timeout?: number } = {}): AiClient {
  // opts — для тестов (подставной fetch) и smoke-проверки (ждать отказа API дольше)
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0, ...opts });
  return {
    async draft(prompt, schema) {
      let msg: Anthropic.Message;
      try {
        msg = await client.messages.create({
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'disabled' },
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
