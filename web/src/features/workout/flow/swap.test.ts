import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { circuit, setsBlock } from './fixtures';
import { swapCandidates, swapSteps, type SwapOption } from './swap';

const option = (o: Partial<SwapOption> & Pick<SwapOption, 'id' | 'name'>): SwapOption => ({
  kind: 'reps',
  group: 'arms',
  muscles: [],
  defaults: { reps: 10, weight: 20, seconds: 40 },
  ...o,
});

const pushUp = option({ id: 'push-up', name: 'Отжимания', kind: 'reps' });
const press = option({ id: 'french-press', name: 'Французский жим', kind: 'weight' });
const hold = option({ id: 'plank', name: 'Планка', kind: 'time' });

describe('swapSteps', () => {
  // squat ×3 (0–2), plank ×2 (3–4)
  const sets = buildSteps([setsBlock]);

  it('меняет текущий и следующие подходы упражнения, прошлые и чужие не трогает', () => {
    const out = swapSteps(sets, 1, pushUp);
    expect(out.map((s) => s.exerciseId)).toEqual(['squat', 'push-up', 'push-up', 'plank', 'plank']);
    expect(out[1].exerciseName).toBe('Отжимания');
    expect(out[0]).toBe(sets[0]);
    expect(out[3]).toBe(sets[3]);
  });

  it('в круге меняет упражнение только в оставшихся кругах', () => {
    const steps = buildSteps([circuit]);
    // круг 2, первое упражнение (dips): индексы 3, 6 — dips; 4, 7 — scissors
    const out = swapSteps(steps, 3, pushUp);
    expect(out.map((s) => s.exerciseId)).toEqual(['dips', 'scissors', 'lunge', 'push-up', 'scissors', 'lunge', 'push-up', 'scissors', 'lunge']);
  });

  it('тот же тип: цель и вес остаются из плана', () => {
    const out = swapSteps(sets, 0, option({ id: 'goblet', name: 'Кубковый присед', kind: 'weight' }));
    expect(out[0].plan).toEqual({ target: { min: 12, max: 12 }, weight: 12 });
    expect(out[0].kind).toBe('weight');
  });

  it('другой тип, истории нет: повторы и секунды по умолчанию, веса в плане нет', () => {
    expect(swapSteps(sets, 0, pushUp)[0].plan).toEqual({ target: { min: 10, max: 10 } });
    expect(swapSteps(sets, 0, hold)[0].plan).toEqual({ target: { min: 40, max: 40 } });
    const fromReps = swapSteps(buildSteps([circuit]), 0, press);
    expect(fromReps[0].plan).toEqual({ target: { min: 10, max: 10 } });
  });

  it('другой тип, история есть: последний подход последней тренировки', () => {
    const withHistory = (o: SwapOption) => ({
      ...o,
      sessions: [{ sets: [] }, { sets: [{ weight: 8, reps: 12 }, { weight: 10, reps: 9 }] }, { sets: [{ weight: 5, reps: 15 }] }],
    });
    const fromReps = swapSteps(buildSteps([circuit]), 0, withHistory(press));
    expect(fromReps[0].plan).toEqual({ target: { min: 9, max: 9 }, weight: 10 });
    const toTime = swapSteps(sets, 0, { ...hold, sessions: [{ sets: [{ seconds: 55 }] }] });
    expect(toTime[0].plan).toEqual({ target: { min: 55, max: 55 } });
  });

  it('сохраняет круг, подход, отдых и отметку записи видео', () => {
    const steps = buildSteps([circuit]);
    const out = swapSteps(steps, 3, pushUp);
    expect(out[3]).toMatchObject({
      blockIndex: steps[3].blockIndex,
      blockId: steps[3].blockId,
      mode: steps[3].mode,
      round: 2,
      rounds: 3,
      indexInBlock: steps[3].indexInBlock,
      blockSize: steps[3].blockSize,
      restAfterSec: 60,
    });
    expect(out[3].record).toBe(true);
  });

  it('позу прежнего упражнения не оставляет', () => {
    const steps = buildSteps([circuit]);
    expect(steps[0].pose).toBe('dips');
    expect(swapSteps(steps, 0, pushUp)[0].pose).toBeUndefined();
  });

  it('помнит, что было в плане, и после второй замены тоже', () => {
    const once = swapSteps(sets, 0, pushUp);
    expect(once[0].replaced).toEqual({ id: 'squat', name: 'Приседания' });
    expect(once[2].replaced).toEqual({ id: 'squat', name: 'Приседания' });
    const twice = swapSteps(once, 0, hold);
    expect(twice[0].replaced).toEqual({ id: 'squat', name: 'Приседания' });
    expect(twice[0].exerciseId).toBe('plank');
  });

  it('возврат к упражнению из плана снимает пометку', () => {
    const back = swapSteps(swapSteps(sets, 0, pushUp), 0, option({ id: 'squat', name: 'Приседания', kind: 'weight' }));
    expect(back[0].replaced).toBeUndefined();
    expect('replaced' in back[0]).toBe(false);
  });

  it('не меняет исходный массив', () => {
    const copy = JSON.stringify(sets);
    swapSteps(sets, 0, pushUp);
    expect(JSON.stringify(sets)).toBe(copy);
  });
});

describe('swapCandidates', () => {
  const lib: SwapOption[] = [
    option({ id: 'dips', name: 'Отжимания на брусьях', group: 'arms', muscles: ['трицепс', 'грудь'] }),
    option({ id: 'french-press', name: 'Французский жим', group: 'arms', muscles: ['трицепс'] }),
    option({ id: 'biceps-curl', name: 'Сгибания на бицепс', group: 'arms', muscles: ['бицепс'] }),
    option({ id: 'push-up', name: 'Отжимания', group: 'chest', muscles: ['грудь', 'трицепс'], aliases: ['пушапы'] }),
    option({ id: 'plank', name: 'Планка', group: 'core', muscles: ['пресс'] }),
  ];

  it('без текущего упражнения в списке и с похожими мышцами сверху', () => {
    const { related, other } = swapCandidates(lib, 'dips', '');
    expect(related.map((e) => e.id)).toEqual(['push-up', 'french-press', 'biceps-curl']);
    expect(other.map((e) => e.id)).toEqual(['plank']);
  });

  it('больше общих мышц — выше; при равенстве та же группа выше', () => {
    const { related } = swapCandidates(lib, 'dips', '');
    // push-up: трицепс + грудь = 2 общих; french-press: 1 общая + группа; biceps-curl: только группа
    expect(related[0].id).toBe('push-up');
    expect(related[1].id).toBe('french-press');
  });

  it('упражнения нет в библиотеке: всё в общем списке по алфавиту', () => {
    const { related, other } = swapCandidates(lib, 'unknown', '');
    expect(related).toEqual([]);
    expect(other.map((e) => e.name)).toEqual(['Отжимания', 'Отжимания на брусьях', 'Планка', 'Сгибания на бицепс', 'Французский жим']);
  });

  it('поиск по названию и по другим названиям без учёта регистра', () => {
    expect(swapCandidates(lib, 'dips', 'ФРАНЦУЗСКИЙ').related.map((e) => e.id)).toEqual(['french-press']);
    expect(swapCandidates(lib, 'dips', 'пушапы').related.map((e) => e.id)).toEqual(['push-up']);
    expect(swapCandidates(lib, 'dips', 'zzz')).toEqual({ related: [], other: [] });
  });
});
