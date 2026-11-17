import { describe, expect, it } from 'vitest';
import { AI_EFFORT, AI_MODEL, anthropicClient } from './aiClient';
import type { Prompt } from './aiPrompt';

const prompt: Prompt = {
  system: [
    { type: 'text', text: 'инструкции' },
    { type: 'text', text: 'правила', cache_control: { type: 'ephemeral' } },
  ],
  user: 'ввод тренера',
};
const schema = { type: 'object', properties: {}, required: [], additionalProperties: false };

/** Подставной fetch: запоминает тело запроса и отвечает как Messages API, в сеть не ходит */
function fakeFetch(reply: { status?: number; body: unknown }) {
  const sent: Array<Record<string, unknown>> = [];
  const fetch = async (_url: unknown, init?: { body?: unknown }) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch: fetch as unknown as typeof globalThis.fetch, sent };
}

const message = (text: string, stop = 'end_turn') => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: AI_MODEL,
  content: [{ type: 'text', text }],
  stop_reason: stop,
  stop_sequence: null,
  usage: { input_tokens: 40, output_tokens: 900, cache_creation_input_tokens: 3000, cache_read_input_tokens: 0 },
});

describe('anthropicClient', () => {
  it('sends model, structured output schema, effort, adaptive thinking and cached system', async () => {
    const f = fakeFetch({ body: message('{"title":"x"}') });
    await anthropicClient('test-key', { fetch: f.fetch, maxRetries: 0 }).draft(prompt, schema);
    const body = f.sent[0]!;
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.output_config).toEqual({ effort: AI_EFFORT, format: { type: 'json_schema', schema } });
    expect(body.thinking).toMatchObject({ type: 'adaptive' });
    expect(body.system).toEqual(prompt.system);
    expect(body.messages).toEqual([{ role: 'user', content: 'ввод тренера' }]);
    expect(body).not.toHaveProperty('stream', true);
  });

  it('parses json and usage', async () => {
    const f = fakeFetch({ body: message('{"title":"Верх"}') });
    const r = await anthropicClient('test-key', { fetch: f.fetch, maxRetries: 0 }).draft(prompt, schema);
    expect(r).toEqual({ json: { title: 'Верх' }, usage: { input: 40, cacheCreation: 3000, cacheRead: 0, output: 900 } });
  });

  it('throws on refusal or cut-off answer', async () => {
    for (const stop of ['refusal', 'max_tokens']) {
      const f = fakeFetch({ body: message('{"tit', stop) });
      await expect(anthropicClient('test-key', { fetch: f.fetch, maxRetries: 0 }).draft(prompt, schema)).rejects.toThrow(stop);
    }
  });

  it('wraps API errors with status only', async () => {
    const f = fakeFetch({ status: 529, body: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } });
    await expect(anthropicClient('test-key', { fetch: f.fetch, maxRetries: 0 }).draft(prompt, schema)).rejects.toMatchObject({ status: 529 });
  });
});
