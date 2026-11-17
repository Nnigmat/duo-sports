/**
 * Один настоящий запрос агенту с текущей схемой: npm run smoke:ai (ключ — ANTHROPIC_API_KEY в окружении или .env).
 * Запускать перед мержем правок AGENT_WORKOUT_SCHEMA: предел сложности грамматики тесты не видят,
 * API отклоняет такую схему 400 «Schema is too complex» только после компиляции, через минуты.
 */
import { AGENT_WORKOUT_SCHEMA, compactAgentWorkout, isAgentWorkout } from '../shared/aiDraft';
import { AI_MODEL, anthropicClient } from './aiClient';
import { buildPrompt } from './aiPrompt';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error('Нет ANTHROPIC_API_KEY: задайте в окружении или в .env');
  process.exit(1);
}

// Без повторов SDK; компиляция грамматики на стороне API — до 180 с
const client = anthropicClient(key, { maxRetries: 0, timeout: 200_000 });
const prompt = buildPrompt({
  rules: '',
  routines: [],
  library: [
    { id: 'bench-press', name: 'Жим лёжа', aliases: ['жим штанги лёжа'], kind: 'weight', muscles: ['грудь'], equipment: ['штанга'] },
    { id: 'squat', name: 'Присед', aliases: ['приседания со штангой'], kind: 'weight', muscles: ['ноги'], equipment: ['штанга'] },
  ],
  request: { athleteId: null, date: '2026-11-18', title: '', warmup: null, main: { text: 'жим лёжа 3×8 60 кг, присед 3×10', exercises: [] }, cooldown: null },
  today: '2026-11-17',
});

const started = Date.now();
const seconds = () => `${((Date.now() - started) / 1000).toFixed(1)} с`;
try {
  const { json, usage } = await client.draft(prompt, AGENT_WORKOUT_SCHEMA);
  if (!isAgentWorkout(compactAgentWorkout(json))) {
    console.error(`${AI_MODEL}: ответ не по схеме, ${seconds()}`);
    process.exit(1);
  }
  console.log(`${AI_MODEL}: схема принята, ответ по схеме, ${seconds()}, токены ${JSON.stringify(usage)}`);
} catch (e) {
  console.error(`${AI_MODEL}: ${e instanceof Error ? e.message : 'unknown'}, ${seconds()}`);
  process.exit(1);
}
