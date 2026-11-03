import { describe, expect, it } from 'vitest';
import type { AthleteSessionsResponse, Block, TrainerHistoryItem, TrainerPlanItem } from '../../../../shared/types';
import { buildCommentRequest, defaultSelection, findSlug, firstName, historyBadge, historyMeta, movedText, planSteps, plannedBadge, rowDate, sameSelection, selectionFor } from './sessions';

const NB = '\u00a0';
const TODAY = '2026-11-02';

const hist = (over: Partial<TrainerHistoryItem> = {}): TrainerHistoryItem => ({
  sessionId: 7,
  date: '2026-11-01',
  title: 'Всё тело',
  durationSec: 46 * 60,
  volumeKg: 4380,
  setsDone: 20,
  videos: 2,
  reviewedAt: null,
  newFromAthlete: 0,
  ...over,
});
const plan = (over: Partial<TrainerPlanItem> = {}): TrainerPlanItem => ({ kind: 'planned', date: '2026-11-05', workoutId: 3, title: 'Ноги', exerciseCount: 3, ...over });

describe('rowDate', () => {
  it('сегодня, вчера и завтра подписаны словом', () => {
    expect(rowDate('2026-11-02', TODAY)).toBe('Сегодня · Пн, 2 ноября');
    expect(rowDate('2026-11-01', TODAY)).toBe('Вс, 1 ноября · вчера');
    expect(rowDate('2026-11-03', TODAY)).toBe('Вт, 3 ноября · завтра');
  });
  it('остальные дни: день недели и дата', () => {
    expect(rowDate('2026-10-31', TODAY)).toBe('Сб, 31 октября');
    expect(rowDate('2026-11-05', TODAY)).toBe('Чт, 5 ноября');
  });
});

describe('historyMeta, historyBadge', () => {
  it('минуты, объём, подходы и видео через точку, числа с неразрывным пробелом', () => {
    expect(historyMeta(hist())).toBe(`46${NB}мин · 4${NB}380${NB}кг · 20${NB}подходов · 2${NB}видео`);
  });
  it('нет длительности, объёма и видео — не показываем', () => {
    expect(historyMeta(hist({ durationSec: null, volumeKg: 0, videos: 0, setsDone: 1 }))).toBe(`1${NB}подход`);
  });
  it('статус: ждёт разбора или разобрана', () => {
    expect(historyBadge(hist())).toBe('review');
    expect(historyBadge(hist({ reviewedAt: '2026-11-02T10:00:00' }))).toBe('reviewed');
  });
});

describe('plannedBadge, movedText', () => {
  it('сегодняшняя тренировка отмечена, остальные запланированы', () => {
    expect(plannedBadge(plan({ date: TODAY }), TODAY)).toBe('today');
    expect(plannedBadge(plan(), TODAY)).toBe('planned');
  });
  it('подписи переноса', () => {
    expect(movedText(plan({ kind: 'moved', movedTo: '2026-11-06' }))).toBe('Перенесена на пт, 6 ноября');
    expect(movedText(plan({ movedFrom: '2026-11-04' }))).toBe('Перенесена с ср, 4 ноября');
    expect(movedText({ movedFrom: '2026-10-29' })).toBe('Перенесена с чт, 29 октября');
    expect(movedText(plan())).toBeNull();
  });
});

describe('defaultSelection, sameSelection', () => {
  const none: AthleteSessionsResponse = { planned: [], history: [] };
  it('сначала то, что ждёт разбора, потом свежая выполненная, потом ближайшая запланированная', () => {
    const s: AthleteSessionsResponse = { planned: [plan()], history: [hist({ sessionId: 9, reviewedAt: 'x' }), hist({ sessionId: 8 })] };
    expect(defaultSelection(s)).toEqual({ kind: 'session', sessionId: 8 });
    expect(defaultSelection({ ...s, history: [hist({ sessionId: 9, reviewedAt: 'x' })] })).toEqual({ kind: 'session', sessionId: 9 });
    expect(defaultSelection({ planned: [plan({ kind: 'moved', movedTo: '2026-11-06' }), plan({ workoutId: 4 })], history: [] })).toEqual({ kind: 'plan', date: '2026-11-05', workoutId: 4 });
    expect(defaultSelection(none)).toBeNull();
  });
  it('сравнение выбора', () => {
    expect(sameSelection({ kind: 'session', sessionId: 1 }, { kind: 'session', sessionId: 1 })).toBe(true);
    expect(sameSelection({ kind: 'session', sessionId: 1 }, { kind: 'plan', date: 'd', workoutId: 1 })).toBe(false);
    expect(sameSelection(null, null)).toBe(false);
  });
});

describe('findSlug', () => {
  const lib = [
    { id: 'squat', name: 'Приседания со штангой', aliases: ['Присед'] },
    { id: 'plank', name: 'Планка', aliases: [] },
  ];
  it('по названию без учёта регистра и по псевдониму', () => {
    expect(findSlug('приседания со штангой', lib)).toBe('squat');
    expect(findSlug(' Присед ', lib)).toBe('squat');
  });
  it('нет в библиотеке — null', () => {
    expect(findSlug('Круг: мост, выпады', lib)).toBeNull();
  });
});

describe('firstName', () => {
  it('имя без фамилии и точки', () => {
    expect(firstName('Никита Н.')).toBe('Никита');
    expect(firstName('')).toBe('Ученик');
  });
});

describe('buildCommentRequest', () => {
  const base = { text: 'Хорошо', sessionId: 7 };
  it('к моменту видео', () => {
    expect(buildCommentRequest({ ...base, slug: 'squat', videoId: 'v1', attachedSec: 21 })).toEqual({ text: 'Хорошо', videoId: 'v1', timecodeSec: 21 });
    expect(buildCommentRequest({ ...base, slug: null, videoId: 'v1', attachedSec: 0 })).toEqual({ text: 'Хорошо', videoId: 'v1', timecodeSec: 0 });
  });
  it('к упражнению из библиотеки', () => {
    expect(buildCommentRequest({ ...base, slug: 'squat', videoId: 'v1', attachedSec: null })).toEqual({ text: 'Хорошо', sessionId: 7, exerciseId: 'squat' });
  });
  it('упражнения нет в библиотеке: к видео, а без видео ко всей тренировке', () => {
    expect(buildCommentRequest({ ...base, slug: null, videoId: 'v1', attachedSec: null })).toEqual({ text: 'Хорошо', videoId: 'v1' });
    expect(buildCommentRequest({ ...base, slug: null, videoId: null, attachedSec: null })).toEqual({ text: 'Хорошо', sessionId: 7 });
  });
  it('обрезает пробелы', () => {
    expect(buildCommentRequest({ text: '  Ок  ', sessionId: 7, slug: null, videoId: null, attachedSec: null }).text).toBe('Ок');
  });
});

describe('planSteps', () => {
  const blocks: Block[] = [
    { id: 'b0', mode: 'timed', title: 'Разминка', exercises: [{ id: 'b0-e0', name: 'Разминка', kind: 'time', target: { min: 300, max: 300 } }] },
    { id: 'b1', mode: 'sets', title: 'Силовая', restSec: 90, videoRounds: [], exercises: [{ id: 'b1-e0', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 62.5, sets: 3 }] },
    { id: 'b2', mode: 'circuit', title: 'Круг', rounds: 2, restSec: 30, videoRounds: [], exercises: [{ id: 'b2-e0', name: 'Планка', kind: 'time', target: { min: 60, max: 60 } }, { id: 'b2-e1', name: 'Скручивания', kind: 'reps', target: { min: 18, max: 20 } }] },
  ];
  it('подходы по блокам: timed — один, sets — по числу подходов, circuit — по числу кругов', () => {
    const steps = planSteps(blocks);
    expect(steps.map((s) => s.name)).toEqual(['Разминка', 'Жим лёжа', 'Планка', 'Скручивания']);
    const plain = (sets: string[]) => sets.map((x) => x.replaceAll('\u00a0', ' '));
    expect(plain(steps[0]!.sets)).toEqual(['05:00']);
    expect(plain(steps[1]!.sets)).toEqual(['62,5 кг × 8', '62,5 кг × 8', '62,5 кг × 8']);
    expect(steps[2]!.sets).toHaveLength(2);
    expect(plain(steps[3]!.sets)).toEqual(['18–20 повт', '18–20 повт']);
    expect(steps[1]!.key).toBe('b1-e0');
  });
});

describe('selectionFor: тренировка дня из плана', () => {
  const s: AthleteSessionsResponse = {
    planned: [
      { kind: 'planned', date: '2026-11-05', workoutId: 13, title: 'Ноги', exerciseCount: 3 },
      { kind: 'moved', date: '2026-11-04', workoutId: 12, title: 'Кардио', exerciseCount: 3, movedTo: '2026-11-06' },
    ],
    history: [hist({ sessionId: 8, date: '2026-11-01' })],
  };
  it('с workout открывает запланированную тренировку этого дня', () => {
    expect(selectionFor(s, '2026-11-05', '13')).toEqual({ kind: 'plan', date: '2026-11-05', workoutId: 13 });
  });
  it('без workout открывает выполненную в этот день', () => {
    expect(selectionFor(s, '2026-11-01')).toEqual({ kind: 'session', sessionId: 8 });
  });
  it('перенесённую, чужой номер, кривую дату и пустой день не выбирает', () => {
    expect(selectionFor(s, '2026-11-04', '12')).toBeNull();
    expect(selectionFor(s, '2026-11-05', '99')).toBeNull();
    expect(selectionFor(s, '2026-11-05', 'x')).toBeNull();
    expect(selectionFor(s, null, '13')).toBeNull();
    expect(selectionFor(s, '2026-11-09')).toBeNull();
  });
});
