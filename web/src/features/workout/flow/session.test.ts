import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit, setsBlock, warmup } from './fixtures';
import { initSession, reduce, type Session } from './session';

// 0–1 разминка (timed), 2–10 круговые подходы (rest 60 с, кроме последнего)
const steps = buildSteps([warmup, circuit]);
const fresh = () => initSession(steps);
const at = (s: Session, index: number, phase: Session['phase'] = 'work'): Session => ({ ...s, index, phase });

describe('initSession', () => {
  it('стоит на старте, ничего не выполнено', () => {
    const s = fresh();
    expect(s).toMatchObject({ phase: 'start', index: 0, videos: 0 });
    expect(s.completed).toEqual(steps.map(() => false));
  });
});

describe('begin', () => {
  it('идёт к первому шагу; таймер разминки запускается сам', () => {
    const s = reduce(fresh(), { type: 'begin' });
    expect(s).toMatchObject({ phase: 'work', index: 0, timerStarted: true });
  });

  it('повторный begin не сбрасывает ход тренировки', () => {
    const s = at(reduce(fresh(), { type: 'begin' }), 4);
    expect(reduce(s, { type: 'begin' })).toBe(s);
  });
});

describe('done', () => {
  it('шаг без отдыха: сразу следующий; следующий подход на повторы ждёт «Готово»', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 1), { type: 'done' });
    expect(s).toMatchObject({ phase: 'work', index: 2, timerStarted: false });
    expect(s.completed[1]).toBe(true);
  });

  it('подход с отдыхом: после «Готово» идёт отдых на том же шаге', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'done' });
    expect(s).toMatchObject({ phase: 'rest', index: 2 });
    expect(s.completed[2]).toBe(true);
  });

  it('последний шаг: финиш', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), steps.length - 1), { type: 'done' });
    expect(s.phase).toBe('finish');
    expect(s.completed[steps.length - 1]).toBe(true);
  });

  it('до старта и на финише игнорируется', () => {
    const start = fresh();
    expect(reduce(start, { type: 'done' })).toBe(start);
    const fin = { ...start, phase: 'finish' as const };
    expect(reduce(fin, { type: 'done' })).toBe(fin);
  });
});

describe('rest', () => {
  const resting = () => reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'done' });

  it('конец отдыха ведёт к следующему подходу', () => {
    expect(reduce(resting(), { type: 'restOver' })).toMatchObject({ phase: 'work', index: 3 });
  });

  it('«Пропустить» на отдыхе делает то же', () => {
    expect(reduce(resting(), { type: 'skip' })).toMatchObject({ phase: 'work', index: 3 });
  });

  it('«Назад» на отдыхе возвращает к подходу, он снова не выполнен', () => {
    const s = reduce(resting(), { type: 'back' });
    expect(s).toMatchObject({ phase: 'work', index: 2 });
    expect(s.completed[2]).toBe(false);
  });

  it('конец отдыха вне отдыха игнорируется', () => {
    const s = at(reduce(fresh(), { type: 'begin' }), 3);
    expect(reduce(s, { type: 'restOver' })).toBe(s);
  });
});

describe('skip', () => {
  it('пропущенный подход не выполнен и отдыха после него нет', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'skip' });
    expect(s).toMatchObject({ phase: 'work', index: 3 });
    expect(s.completed[2]).toBe(false);
  });

  it('пропуск последнего шага: финиш', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), steps.length - 1), { type: 'skip' });
    expect(s.phase).toBe('finish');
    expect(s.completed[steps.length - 1]).toBe(false);
  });
});

describe('back', () => {
  it('на предыдущий шаг; он снова не выполнен', () => {
    const base = reduce(at(reduce(fresh(), { type: 'begin' }), 3), { type: 'done' });
    const s = reduce(reduce(base, { type: 'restOver' }), { type: 'back' });
    expect(s).toMatchObject({ phase: 'work', index: 3 });
    const prev = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'back' });
    expect(prev).toMatchObject({ phase: 'work', index: 4 });
    expect(prev.completed[4]).toBe(false);
  });

  it('с первого шага: на экран старта', () => {
    expect(reduce(reduce(fresh(), { type: 'begin' }), { type: 'back' }).phase).toBe('start');
  });

  it('на шаг разминки: таймер снова запускается сам', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'back' });
    expect(s).toMatchObject({ index: 1, timerStarted: true });
  });
});

describe('таймер упражнения на время', () => {
  const plankSteps = buildSteps([setsBlock]); // 0–2 приседания, 3–4 планка
  const plank = () => reduce(at(initSession(plankSteps), 3), { type: 'begin' });

  it('в блоке подходами таймер ждёт «Старт»', () => {
    const s = reduce(initSession(plankSteps), { type: 'begin' });
    const onPlank = { ...s, index: 3, timerStarted: false };
    expect(reduce(onPlank, { type: 'startTimer' }).timerStarted).toBe(true);
    expect(plank().timerStarted).toBe(false);
  });
});

describe('recorded', () => {
  it('видео сохранено: счётчик растёт и подход выполнен', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'recorded', videoId: 'v-5' });
    expect(s.videos).toBe(1);
    expect(s.videoIds[5]).toBe('v-5');
    expect(s.videoIds.filter(Boolean)).toHaveLength(1);
    expect(s.completed[5]).toBe(true);
    expect(s).toMatchObject({ phase: 'rest', index: 5 });
  });
});

describe('recorded без id', () => {
  it('сервер id не вернул: подход выполнен, видео посчитано, привязки нет', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'recorded' });
    expect(s.videos).toBe(1);
    expect(s.videoIds[5]).toBeNull();
  });
});

describe('finishNow', () => {
  it('выход с подтверждением: финиш с тем, что выполнено', () => {
    const s = reduce(reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'done' }), { type: 'finishNow' });
    expect(s.phase).toBe('finish');
    expect(s.completed[2]).toBe(true);
  });
});

describe('editPlan', () => {
  const plan = { target: { min: 16, max: 16 } };

  it('только текущий шаг', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'editPlan', plan, apply: false });
    expect(s.steps[2].plan.target.min).toBe(16);
    expect(s.steps[5].plan.target.min).toBe(18);
  });

  it('с применением к следующим кругам', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'editPlan', plan, apply: true });
    expect([2, 5, 8].map((i) => s.steps[i].plan.target.min)).toEqual([16, 16, 16]);
    expect(s.steps[3].plan.target.min).toBe(30);
  });
});

describe('факт подхода', () => {
  const working = (index: number) => at(reduce(fresh(), { type: 'begin' }), index);

  it('в начале фактов нет', () => {
    expect(fresh().actuals).toEqual(steps.map(() => null));
  });

  it('«Готово» с фактом сохраняет его у шага, план не меняется', () => {
    const s = reduce(working(2), { type: 'done', actual: { value: 17 } });
    expect(s.actuals[2]).toEqual({ value: 17 });
    expect(s.steps).toEqual(steps);
    expect(s.completed[2]).toBe(true);
  });

  it('факт одного подхода не попадает в другие', () => {
    const s = reduce(working(2), { type: 'done', actual: { value: 17 } });
    expect(s.actuals.filter((a) => a !== null)).toHaveLength(1);
  });

  it('«Готово» без факта (разминка) оставляет факт пустым', () => {
    const s = reduce(working(0), { type: 'done' });
    expect(s.completed[0]).toBe(true);
    expect(s.actuals[0]).toBeNull();
  });

  it('«Пропустить» не выполняет подход и не пишет факт', () => {
    const s = reduce(working(2), { type: 'skip' });
    expect(s.completed[2]).toBe(false);
    expect(s.actuals[2]).toBeNull();
  });

  it('«Назад» с отдыха сохраняет введённый факт, а подход снова не выполнен', () => {
    const rest = reduce(working(2), { type: 'done', actual: { value: 17 } });
    const back = reduce(rest, { type: 'back' });
    expect(back).toMatchObject({ phase: 'work', index: 2 });
    expect(back.completed[2]).toBe(false);
    expect(back.actuals[2]).toEqual({ value: 17 });
  });

  it('«Назад» со следующего подхода возвращает к предыдущему с его фактом', () => {
    const next = reduce(reduce(working(2), { type: 'done', actual: { value: 17 } }), { type: 'restOver' });
    const back = reduce(next, { type: 'back' });
    expect(back.index).toBe(2);
    expect(back.actuals[2]).toEqual({ value: 17 });
  });

  it('повторное «Готово» перезаписывает факт', () => {
    const back = reduce(reduce(working(2), { type: 'done', actual: { value: 17 } }), { type: 'back' });
    const again = reduce(back, { type: 'done', actual: { value: 20, extraWeight: true } });
    expect(again.actuals[2]).toEqual({ value: 20, extraWeight: true });
  });

  it('после «Назад» и «Пропустить» факт стирается', () => {
    const back = reduce(reduce(working(2), { type: 'done', actual: { value: 17 } }), { type: 'back' });
    expect(reduce(back, { type: 'skip' }).actuals[2]).toBeNull();
  });
});
