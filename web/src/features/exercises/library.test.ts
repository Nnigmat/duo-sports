import { describe, expect, it } from 'vitest';
import {
  applyDraft, barsNote, canSubmit, createExercise, draftFromExercise, emptyDraft, exerciseIcon, formatKg,
  formatReps, formatTime, groupExercises, groupForMuscles, groupHint, groupTabs, hiddenSessions, lastSessionRows,
  latestMedia, mediaCountText, paramFields, recordText, recordTiles, searchExercises, sessionSummary, sortSessions,
  planShort, toggleItem, totalText, trendInfo, canManageExercises, noteSteps,
  toExerciseInput, toExercisePatch,
} from './library';
import { exerciseLibrary } from './mock';
import type { LibraryExercise } from './types';

const plain = (s: string) => s.replaceAll(' ', ' ');

const squat: LibraryExercise = {
  id: 'squat', name: 'Приседания со штангой', kind: 'weight', group: 'legs', muscles: ['Квадрицепс', 'Ягодицы'],
  equipment: 'Штанга', defaults: { reps: 5, weight: 80, seconds: 30 },
  record: { weight: 80, reps: 5, date: '28 окт' }, sessionsTotal: 14,
  sessions: [
    { date: '28 окт', isRecord: true, videos: [{ title: 'Подход 4', duration: '0:21' }], comments: [{ author: 'Настя', text: 'Глубина хорошая' }],
      sets: [{ weight: 80, reps: 5 }, { weight: 80, reps: 4 }] },
    { date: '19 окт', videos: [], comments: [], sets: [{ weight: 75, reps: 5 }] },
  ],
  trend: [60, 62.5, 80],
};
const pullup: LibraryExercise = {
  id: 'pullup', name: 'Подтягивания', kind: 'reps', group: 'back', muscles: ['Широчайшие'], equipment: 'Турник',
  defaults: { reps: 6, weight: 20, seconds: 30 }, record: { reps: 6, date: '12 окт' }, sessionsTotal: 10,
  sessions: [{ date: '26 окт', videos: [], comments: [], sets: [{ reps: 5 }, { reps: 3 }] }], trend: [2, 6, 5],
};
const plank: LibraryExercise = {
  id: 'plank', name: 'Планка', kind: 'time', group: 'core', muscles: ['Пресс'], equipment: 'Без снаряда',
  defaults: { reps: 10, weight: 20, seconds: 105 }, record: { seconds: 105, date: '21 окт' }, sessionsTotal: 15,
  sessions: [{ date: '28 окт', videos: [], comments: [], sets: [{ seconds: 90 }, { seconds: 60 }] }], trend: [60, 105, 90],
};
const fresh = createExercise({ ...emptyDraft(), name: ' Болгарские выпады ', muscles: ['Ягодицы'] }, 'custom1');
const all = [squat, pullup, plank, fresh];

describe('подписи', () => {
  it('вес, повторы, время', () => {
    expect(plain(formatKg(62.5))).toBe('62,5 кг');
    expect(plain(formatKg(14, true))).toBe('2 × 14 кг');
    expect(plain(formatKg(1250))).toBe('1 250 кг');
    expect(plain(formatReps(1))).toBe('1 повтор');
    expect(plain(formatReps(5))).toBe('5 повторов');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(45)).toBe('0:45');
  });
  it('рекорд по типам', () => {
    expect(plain(recordText(squat))).toBe('80 кг × 5');
    expect(plain(recordText(pullup))).toBe('6 повторов');
    expect(recordText(plank)).toBe('1:45');
    expect(recordText(fresh)).toBe('');
  });
  it('счётчик в шапке списка', () => {
    expect(totalText(17, 7)).toBe('17 упражнений · 7 в плане');
    expect(totalText(1, 0)).toBe('1 упражнение · 0 в плане');
  });
  it('иконка: время — таймер, иначе по снаряду', () => {
    expect(exerciseIcon('time', 'Скакалка')).toBe('timer');
    expect(exerciseIcon('weight', 'Гантели')).toBe('dumbbell');
    expect(exerciseIcon('reps', 'что-то новое')).toBe('body');
  });
});

describe('список', () => {
  it('поиск по названию, мышце и снаряду без учёта регистра', () => {
    expect(searchExercises(all, 'ПРИСЕД')).toEqual([squat]);
    expect(searchExercises(all, 'широчайшие')).toEqual([pullup]);
    expect(searchExercises(all, 'турник')).toEqual([pullup]);
    expect(searchExercises(all, '  ')).toEqual(all);
    expect(searchExercises(all, 'нет такого')).toEqual([]);
  });
  it('разделы идут в порядке групп, пустые пропускаются', () => {
    expect(groupExercises(all).map((g) => g.id)).toEqual(['legs', 'back', 'core']);
    expect(groupExercises(all, 'back').map((g) => g.id)).toEqual(['back']);
    expect(groupExercises([], 'all')).toEqual([]);
  });
  it('вкладки: «Все» и группы со счётчиком, «Другие» только если есть', () => {
    const tabs = groupTabs(all);
    expect(tabs[0]).toEqual({ id: 'all', name: 'Все', count: 4 });
    expect(tabs.find((t) => t.id === 'legs')?.count).toBe(2);
    expect(tabs.some((t) => t.id === 'other')).toBe(false);
    const other = createExercise({ ...emptyDraft(), name: 'Х' }, 'x');
    expect(groupTabs([other]).some((t) => t.id === 'other')).toBe(true);
  });
});

describe('карточка', () => {
  it('метка плана', () => {
    expect(planShort('Сб, 31 окт · Ноги и ягодицы')).toBe('В плане · Сб');
  });
  it('плитки по типам', () => {
    expect(recordTiles(squat).map((t) => plain(t.value))).toEqual(['80 кг × 5', '14']);
    expect(recordTiles(squat)[1].label).toBe('тренировок всего');
    const reps = recordTiles(pullup);
    expect(reps[0].wide).toBe(true);
    expect(plain(reps[1].value)).toBe('8 повторов');
    expect(recordTiles(plank)[1].value).toBe('2:30');
    expect(recordTiles(fresh)).toEqual([]);
  });
  it('подходы последней тренировки: рекорд и полоски', () => {
    const rows = lastSessionRows(squat);
    expect(rows.map((r) => r.isRecord)).toEqual([true, false]);
    expect(rows[0].bar).toBeUndefined();
    const reps = lastSessionRows(pullup);
    expect(reps.map((r) => Math.round(r.bar ?? 0))).toEqual([83, 50]);
    expect(reps.every((r) => !r.isRecord)).toBe(true);
    expect(lastSessionRows(fresh)).toEqual([]);
  });
  it('пояснение к полоскам только для повторов и времени', () => {
    expect(barsNote(squat)).toBe('');
    expect(plain(barsNote(pullup))).toBe('Полоска — от вашего рекорда, 6 повторов.');
    expect(barsNote(plank)).toBe('Полоска — от вашего рекорда, 1:45.');
  });
  it('график: заголовок, края и описание', () => {
    const t = trendInfo(squat);
    expect(t.title).toBe('Рабочий вес');
    expect(plain(t.aria)).toBe('Рабочий вес за 3 тренировки: от 60 кг до 80 кг');
    expect(t.caption).toBe('3 тренировки');
    expect(trendInfo(fresh).aria).toBe('');
  });
  it('последнее видео и комментарий', () => {
    const m = latestMedia(squat);
    expect(m.video).toMatchObject({ date: '28 окт', title: 'Подход 4', duration: '0:21' });
    expect(m.comment?.author).toBe('Настя');
    expect(latestMedia(pullup).video).toBeUndefined();
    expect(mediaCountText(2, 3)).toBe('2 видео · 3 комментария');
    expect(mediaCountText(0, 1)).toBe('1 комментарий');
    expect(mediaCountText(0, 0)).toBe('');
  });
});

describe('история', () => {
  it('сортировка не меняет исходный массив', () => {
    expect(sortSessions(squat.sessions, 'new')[0].date).toBe('28 окт');
    expect(sortSessions(squat.sessions, 'old')[0].date).toBe('19 окт');
    expect(squat.sessions[0].date).toBe('28 окт');
  });
  it('итог тренировки', () => {
    expect(sessionSummary('weight', squat.sessions[0].sets)).toBe('2 подхода');
    expect(plain(sessionSummary('reps', pullup.sessions[0].sets))).toBe('всего 8 повторов');
    expect(sessionSummary('time', plank.sessions[0].sets)).toBe('всего 2:30');
  });
  it('сколько не загружено', () => {
    expect(hiddenSessions(squat)).toBe(12);
    expect(hiddenSessions(fresh)).toBe(0);
  });
});

describe('форма', () => {
  it('параметры зависят от типа', () => {
    expect(paramFields('weight').map((f) => f.key)).toEqual(['reps', 'weight']);
    expect(paramFields('reps').map((f) => f.key)).toEqual(['reps']);
    expect(paramFields('time')[0]).toMatchObject({ key: 'seconds', mode: 'duration' });
  });
  it('создать можно только с названием', () => {
    expect(canSubmit(emptyDraft())).toBe(false);
    expect(canSubmit({ ...emptyDraft(), name: '   ' })).toBe(false);
    expect(canSubmit({ ...emptyDraft(), name: 'Мост' })).toBe(true);
  });
  it('раздел по первой мышце', () => {
    expect(groupForMuscles(['Грудь', 'Трицепс'])).toBe('chest');
    expect(groupForMuscles([])).toBe('other');
    expect(groupForMuscles(['Неизвестная'])).toBe('other');
    expect(groupHint([])).toMatch(/По первой выбранной мышце/);
    expect(groupHint(['Спина'])).toBe('В списке упражнение окажется в разделе «Спина».');
  });
  it('toggleItem добавляет и убирает', () => {
    expect(toggleItem(['а'], 'б')).toEqual(['а', 'б']);
    expect(toggleItem(['а', 'б'], 'а')).toEqual(['б']);
  });
  it('новое упражнение: значения по умолчанию', () => {
    expect(fresh).toMatchObject({ name: 'Болгарские выпады', group: 'legs', equipment: 'Без снаряда', sessionsTotal: 0 });
    expect(createExercise(emptyDraft(), 'y').muscles).toEqual(['Всё тело']);
  });
  it('редактирование сохраняет историю и группу', () => {
    const draft = { ...draftFromExercise(squat), name: ' ', kind: 'reps' as const, muscles: [], equipment: 'Гантели' };
    const next = applyDraft(squat, draft);
    expect(next).toMatchObject({ name: squat.name, kind: 'reps', muscles: squat.muscles, equipment: 'Гантели', group: 'legs' });
    expect(next.sessions).toBe(squat.sessions);
  });
});

describe('права и запись', () => {
  const base = (exerciseLibrary.find((e) => e.id === 'squat') ?? exerciseLibrary[0]) as LibraryExercise;
  it('canManageExercises: только тренер и админ', () => {
    expect(canManageExercises('trainer')).toBe(true);
    expect(canManageExercises('admin')).toBe(true);
    expect(canManageExercises('athlete')).toBe(false);
    expect(canManageExercises(null)).toBe(false);
    expect(canManageExercises(undefined)).toBe(false);
  });

  it('noteSteps делит по строкам и убирает пустые', () => {
    expect(noteSteps(' Раз \n\n Два\n')).toEqual(['Раз', 'Два']);
    expect(noteSteps(undefined)).toEqual([]);
  });

  it('toExerciseInput и toExercisePatch', () => {
    const draft = { ...emptyDraft(), name: ' Мост ', muscles: ['Спина'], notes: ' шаг ' };
    expect(toExerciseInput(draft)).toMatchObject({ name: 'Мост', group: 'back', muscles: ['Спина'], aliases: [], notes: 'шаг' });
    expect(toExerciseInput(draft)).not.toHaveProperty('video');
    const ex = { ...base, muscles: ['Спина'] };
    expect(toExercisePatch(draft, ex)).not.toHaveProperty('group');
    expect(toExercisePatch({ ...draft, muscles: ['Грудь'] }, ex)).toMatchObject({ group: 'chest', muscles: ['Грудь'] });
    expect(toExercisePatch(draft, ex)).not.toHaveProperty('aliases');
  });
});
