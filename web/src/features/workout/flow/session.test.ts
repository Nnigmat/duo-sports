import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit, setsBlock, warmup } from './fixtures';
import { afterReload, canGoBack, canSwap, initSession, reduce, type Session } from './session';

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
    expect(reduce(resting(), { type: 'restOver', restSec: 60 })).toMatchObject({ phase: 'work', index: 3 });
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
    expect(reduce(s, { type: 'restOver', restSec: 60 })).toBe(s);
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

describe('фактическое время отдыха', () => {
  const resting = () => reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'done' });

  it('в начале ни у кого отдыха нет', () => {
    expect(fresh().restSec).toEqual(steps.map(() => null));
  });

  it('конец отдыха пишет секунды в шаг, после которого был отдых, в том числе сверх цели', () => {
    const s = reduce(resting(), { type: 'restOver', restSec: 72 });
    expect(s.restSec[2]).toBe(72);
    expect(s.restSec.filter((v) => v !== null)).toHaveLength(1);
  });

  it('«Пропустить» на отдыхе пишет время до нажатия', () => {
    expect(reduce(resting(), { type: 'skip', restSec: 18 }).restSec[2]).toBe(18);
  });

  it('«Пропустить» подход отдыха не создаёт', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 2), { type: 'skip' });
    expect(s.restSec[2]).toBeNull();
  });

  it('«Назад» с отдыха стирает его время: «Готово» запустит отдых заново', () => {
    const s = reduce(reduce(resting(), { type: 'restOver', restSec: 60 }), { type: 'back' });
    expect(s.restSec[2]).toBeNull();
    const again = reduce(reduce(s, { type: 'done' }), { type: 'restOver', restSec: 35 });
    expect(again.restSec[2]).toBe(35);
  });

  it('«Назад» на отдыхе без секунд ничего не оставляет', () => {
    expect(reduce(resting(), { type: 'back' }).restSec[2]).toBeNull();
  });

  it('у последнего подхода отдыха нет', () => {
    const last = reduce(at(reduce(fresh(), { type: 'begin' }), steps.length - 1), { type: 'done' });
    expect(last.phase).toBe('finish');
    expect(last.restSec[steps.length - 1]).toBeNull();
  });

  it('конец отдыха вне отдыха время не пишет', () => {
    const s = at(reduce(fresh(), { type: 'begin' }), 3);
    expect(reduce(s, { type: 'restOver', restSec: 5 })).toBe(s);
  });
});

describe('back', () => {
  it('на предыдущий шаг; он снова не выполнен', () => {
    const base = reduce(at(reduce(fresh(), { type: 'begin' }), 3), { type: 'done' });
    const s = reduce(reduce(base, { type: 'restOver', restSec: 60 }), { type: 'back' });
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

describe('recorded с фактом', () => {
  it('факт из шторки после записи сохраняется на подходе', () => {
    const s = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'recorded', videoId: 'v-5', actual: { value: 8 } });
    expect(s.actuals[5]).toEqual({ value: 8 });
    expect(s.completed[5]).toBe(true);
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
    const s = reduce(reduce(rec, { type: 'restOver', restSec: 60 }), { type: 'back' });
    expect(s).toMatchObject({ phase: 'work', index: 5, videos: 0 });
    expect(s.videoIds[5]).toBeNull();
    expect(s.completed[5]).toBe(false);
  });

  it('«Назад» и повторная запись не считают видео подхода дважды', () => {
    const rec = reduce(at(reduce(fresh(), { type: 'begin' }), 5), { type: 'recorded', videoId: 'v-5' });
    const back = reduce(reduce(rec, { type: 'restOver', restSec: 60 }), { type: 'back' });
    const again = reduce(back, { type: 'recorded', videoId: 'v-5b' });
    expect(again.videos).toBe(1);
    expect(again.videoIds[5]).toBe('v-5b');
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
    const next = reduce(reduce(working(2), { type: 'done', actual: { value: 17 } }), { type: 'restOver', restSec: 60 });
    const back = reduce(next, { type: 'back' });
    expect(back.index).toBe(2);
    expect(back.actuals[2]).toEqual({ value: 17 });
  });

  it('повторное «Готово» перезаписывает факт', () => {
    const back = reduce(reduce(working(2), { type: 'done', actual: { value: 17 } }), { type: 'back' });
    const again = reduce(back, { type: 'done', actual: { value: 20, extraWeight: true } });
    expect(again.actuals[2]).toEqual({ value: 20, extraWeight: true });
  });

  it('подход с видео не оставляет старый факт после «Назад»', () => {
    const back = reduce(reduce(working(2), { type: 'done', actual: { value: 17 } }), { type: 'back' });
    const recorded = reduce(back, { type: 'recorded', videoId: 'v-1' });
    expect(recorded.completed[2]).toBe(true);
    expect(recorded.actuals[2]).toBeNull();
  });

  it('после «Назад» и «Пропустить» факт стирается', () => {
    const back = reduce(reduce(working(2), { type: 'done', actual: { value: 17 } }), { type: 'back' });
    expect(reduce(back, { type: 'skip' }).actuals[2]).toBeNull();
  });
});

describe('afterReload', () => {
  const plankSteps = buildSteps([setsBlock]); // 0–2 приседания, 3–4 планка
  const running = (index: number): Session => ({ ...at(initSession(plankSteps), index), timerStarted: true });

  it('упражнение на время после перезагрузки снова ждёт «Старт»', () => {
    expect(afterReload(running(3)).timerStarted).toBe(false);
  });

  it('разминка и заминка продолжают идти сами', () => {
    const s = { ...at(fresh(), 0), timerStarted: true };
    expect(afterReload(s)).toBe(s);
  });

  it('отдых и финиш не трогает', () => {
    const rest = running(3);
    expect(afterReload({ ...rest, phase: 'rest' })).toMatchObject({ timerStarted: true });
    expect(afterReload({ ...rest, phase: 'finish' })).toMatchObject({ timerStarted: true });
  });
});

describe('swap', () => {
  const swapTo = { id: 'push-up', name: 'Отжимания', kind: 'reps' as const, group: 'chest' as const, muscles: ['грудь'], defaults: { reps: 12, weight: 0, seconds: 30 } };
  const working = (index: number) => at(reduce(fresh(), { type: 'begin' }), index);

  it('меняет упражнение текущего подхода и следующих, прошлые остаются', () => {
    // шаги 2–10: круги по три упражнения; шаг 5 — dips во втором круге
    const s = reduce(working(5), { type: 'swap', to: swapTo });
    expect(s.steps.map((x) => x.exerciseId).slice(2)).toEqual(['dips', 'scissors', 'lunge', 'push-up', 'scissors', 'lunge', 'push-up', 'scissors', 'lunge']);
    expect(s.index).toBe(5);
    expect(s.phase).toBe('work');
  });

  it('выполненное, факты, видео и отдых не трогает', () => {
    const done = reduce(working(2), { type: 'done', actual: { value: 17 } });
    const s = reduce({ ...done, phase: 'work', index: 5 }, { type: 'swap', to: swapTo });
    expect(s.completed).toEqual(done.completed);
    expect(s.actuals).toEqual(done.actuals);
    expect(s.videoIds).toEqual(done.videoIds);
    expect(s.restSec).toEqual(done.restSec);
  });

  it('таймер упражнения на время сбрасывается: новое упражнение ждёт «Старт»', () => {
    const plank = { ...at(initSession(buildSteps([setsBlock])), 3), timerStarted: true };
    const s = reduce(plank, { type: 'swap', to: swapTo });
    expect(s.timerStarted).toBe(false);
  });

  it('на разминке, отдыхе, старте и финише игнорируется', () => {
    const w = working(0);
    expect(reduce(w, { type: 'swap', to: swapTo })).toBe(w);
    const rest = reduce(working(2), { type: 'done' });
    expect(reduce(rest, { type: 'swap', to: swapTo })).toBe(rest);
    expect(reduce(fresh(), { type: 'swap', to: swapTo })).toMatchObject({ phase: 'start' });
    const fin = { ...working(2), phase: 'finish' as const };
    expect(reduce(fin, { type: 'swap', to: swapTo })).toBe(fin);
  });

  it('«Назад» после замены возвращает к прошлому подходу, замена остаётся', () => {
    const s = reduce(working(5), { type: 'swap', to: swapTo });
    const back = reduce(s, { type: 'back' });
    expect(back.index).toBe(4);
    expect(back.steps[5].exerciseId).toBe('push-up');
  });
});

describe('canSwap', () => {
  it('только на подходе упражнения: не на старте, разминке, отдыхе и финише', () => {
    const w = (index: number, phase: Session['phase'] = 'work') => at(reduce(fresh(), { type: 'begin' }), index, phase);
    expect(canSwap(w(2))).toBe(true);
    expect(canSwap(w(0))).toBe(false);
    expect(canSwap(w(2, 'rest'))).toBe(false);
    expect(canSwap(w(2, 'finish'))).toBe(false);
    expect(canSwap(fresh())).toBe(false);
  });
});
