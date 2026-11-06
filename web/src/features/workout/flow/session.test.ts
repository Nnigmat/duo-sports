import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit, setsBlock, warmup } from './fixtures';
import { canGoBack, initSession, reduce, type Session } from './session';

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

describe('canGoBack', () => {
  it('на первом шаге кнопки «Назад» нет', () => {
    expect(canGoBack(reduce(fresh(), { type: 'begin' }))).toBe(false);
  });

  it('на любом следующем шаге есть, в том числе через границу блока', () => {
    const begun = reduce(fresh(), { type: 'begin' });
    expect(canGoBack(at(begun, 1))).toBe(true);
    expect(canGoBack(at(begun, 2))).toBe(true); // первый подход круга после разминки
  });

  it('на отдыхе и финише кнопки нет: там стрелка в шапке или выход', () => {
    const begun = reduce(fresh(), { type: 'begin' });
    expect(canGoBack(at(begun, 4, 'rest'))).toBe(false);
    expect(canGoBack(at(begun, 4, 'finish'))).toBe(false);
  });
});

describe('back через границы', () => {
  it('с первого подхода круга: на последний шаг разминки, отдых пропущен', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'back' });
    expect(s).toMatchObject({ phase: 'work', index: 1 });
  });

  it('из второго круга в первый: на предыдущий подход, а не на его отдых', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'back' });
    expect(s).toMatchObject({ phase: 'work', index: 4 });
  });

  it('шаг с видео: возвращаем в состояние до записи, счётчик уменьшается', () => {
    const rec = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'recorded', videoId: 'v-5' });
    const s = reduce(reduce(rec, { type: 'restOver' }), { type: 'back' });
    expect(s).toMatchObject({ phase: 'work', index: 5, videos: 0 });
    expect(s.videoIds[5]).toBeNull();
    expect(s.completed[5]).toBe(false);
  });

  it('«Назад» и повторная запись не считают видео подхода дважды', () => {
    const rec = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'recorded', videoId: 'v-5' });
    const back = reduce(reduce(rec, { type: 'restOver' }), { type: 'back' });
    const again = reduce(back, { type: 'recorded', videoId: 'v-5b' });
    expect(again.videos).toBe(1);
    expect(again.videoIds[5]).toBe('v-5b');
  });
});
