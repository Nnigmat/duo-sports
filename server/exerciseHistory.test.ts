import { describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { openDb } from './db';
import type { SessionStepResult } from '../shared/types';
import type { LibraryRow } from './comments';
import { HISTORY_SESSIONS, exerciseCommentsOf, exerciseHistories, median, stepSec } from './exerciseHistory';

const lib = (slug: string, name: string, aliases: string[] = []): LibraryRow => ({ slug, name, aliases, notes: null, demo: {} });
const library = [lib('squat', 'Присед', ['приседания']), lib('plank', 'Планка'), lib('pushup', 'Отжимания')];

const step = (name: string, o: Partial<SessionStepResult> = {}): SessionStepResult => ({
  exerciseId: 'x', exerciseName: name, blockIndex: 0, round: 1, rounds: 1, kind: 'weight', plan: { target: { min: 5, max: 5 }, weight: 80 }, completed: true, ...o,
});
const sq = (weight: number, reps: number) => step('Присед', { actual: { value: reps, weight } });
const plank = (sec: number) => step('Планка', { kind: 'time', plan: { target: { min: 60, max: 60 } }, actual: { value: sec } });
const push = (reps: number) => step('Отжимания', { kind: 'reps', plan: { target: { min: 10, max: 10 } }, actual: { value: reps } });

describe('exerciseHistories', () => {
  it('нет тренировок — пустой ответ', () => {
    expect(exerciseHistories([], library)).toEqual([]);
  });

  it('рекорд, число тренировок, тренировки от новых к старым и тренд от старых к новым', () => {
    const out = exerciseHistories(
      [
        { date: '2026-10-12', steps: [sq(85, 5), sq(80, 5)] },
        { date: '2026-10-01', steps: [sq(80, 5)] },
        { date: '2026-10-20', steps: [sq(80, 8)] },
      ],
      library,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      id: 'squat',
      record: { weight: 85, value: 5, date: '2026-10-12' },
      sessionsTotal: 3,
      sessions: [
        { date: '2026-10-20', sets: [{ weight: 80, value: 8 }] },
        { date: '2026-10-12', sets: [{ weight: 85, value: 5 }, { weight: 80, value: 5 }], isRecord: true },
        { date: '2026-10-01', sets: [{ weight: 80, value: 5 }] },
      ],
      trend: [80, 85, 80],
    });
  });

  it('невыполненные подходы пропускаются; тренировка без выполненных подходов не считается', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [sq(80, 5), step('Присед', { completed: false })] }, { date: '2026-10-02', steps: [step('Присед', { completed: false })] }], library);
    expect(out[0]!.sessionsTotal).toBe(1);
    expect(out[0]!.sessions[0]!.sets).toHaveLength(1);
  });

  it('упражнение вне библиотеки не попадает в ответ', () => {
    expect(exerciseHistories([{ date: '2026-10-01', steps: [step('Неизвестное')] }], library)).toEqual([]);
  });

  it('сопоставляет по названию без учёта регистра и по псевдониму', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [step('ПРИСЕДАНИЯ', { actual: { value: 5, weight: 60 } })] }], library);
    expect(out[0]!.id).toBe('squat');
  });

  it('без факта берёт план: вес и нижнюю границу повторов', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [step('Присед', { plan: { target: { min: 6, max: 8 }, weight: 70 } })] }], library);
    expect(out[0]!.sessions[0]!.sets).toEqual([{ weight: 70, value: 6 }]);
  });

  it('время и повторы: значение без веса, тренд по лучшему значению', () => {
    const out = exerciseHistories(
      [{ date: '2026-10-01', steps: [plank(60), plank(45), push(12)] }, { date: '2026-10-05', steps: [plank(95), push(20)] }],
      library,
    );
    const byId = Object.fromEntries(out.map((h) => [h.id, h]));
    expect(byId.plank).toMatchObject({ record: { value: 95, date: '2026-10-05' }, trend: [60, 95], sessions: [{ sets: [{ value: 95 }], isRecord: true }, { sets: [{ value: 60 }, { value: 45 }] }] });
    expect(byId.plank!.record).not.toHaveProperty('weight');
    expect(byId.pushup!.trend).toEqual([12, 20]);
  });

  it('рекорд при равном результате остаётся за первым днём', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [sq(80, 5)] }, { date: '2026-10-08', steps: [sq(80, 5)] }], library);
    expect(out[0]!.record.date).toBe('2026-10-01');
    expect(out[0]!.sessions.map((s) => s.isRecord)).toEqual([undefined, undefined]);
  });

  it('в sessions не больше HISTORY_SESSIONS последних, а всего и тренд считаются по всем', () => {
    const n = HISTORY_SESSIONS + 5;
    const sessions = Array.from({ length: n }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, steps: [sq(50 + i, 5)] }));
    const out = exerciseHistories(sessions, library);
    expect(out[0]!.sessionsTotal).toBe(n);
    expect(out[0]!.sessions).toHaveLength(HISTORY_SESSIONS);
    expect(out[0]!.sessions[0]!.date).toBe(`2026-01-${n}`);
    expect(out[0]!.trend).toHaveLength(n);
  });

  it('две тренировки в один день — две записи', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [sq(80, 5)] }, { date: '2026-10-01', steps: [sq(80, 6)] }], library);
    expect(out[0]!.sessionsTotal).toBe(2);
  });
});

/** Подход с метками: длился `sec` секунд */
const timed = (st: SessionStepResult, sec: number, at = 1_000_000): SessionStepResult => ({ ...st, startedAt: at, endedAt: at + sec * 1000 });

describe('stepSec', () => {
  it('разница меток в секундах, округлённая', () => {
    expect(stepSec(timed(sq(80, 5), 45))).toBe(45);
    expect(stepSec({ ...sq(80, 5), startedAt: 0, endedAt: 1600 })).toBe(2);
  });
  it('нет одной из меток или endedAt раньше startedAt — нет времени', () => {
    expect(stepSec(sq(80, 5))).toBeUndefined();
    expect(stepSec({ ...sq(80, 5), startedAt: 5 })).toBeUndefined();
    expect(stepSec({ ...sq(80, 5), startedAt: 5000, endedAt: 4000 })).toBeUndefined();
  });
  it('нулевая длительность допустима', () => {
    expect(stepSec({ ...sq(80, 5), startedAt: 5000, endedAt: 5000 })).toBe(0);
  });
});

describe('median', () => {
  it('нечётное, чётное и пустое', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 21])).toBe(16);
    expect(median([])).toBeUndefined();
  });
});

describe('время подходов в истории', () => {
  it('timeSec у подходов и totalSec у тренировки', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [timed(sq(80, 5), 40), timed(sq(80, 5), 50)] }], library);
    expect(out[0]!.sessions[0]).toEqual({ date: '2026-10-01', sets: [{ weight: 80, value: 5, timeSec: 40 }, { weight: 80, value: 5, timeSec: 50 }], totalSec: 90 });
    expect(out[0]!.typicalSetSec).toBe(45);
  });

  it('частичные метки: timeSec только у подходов с метками, totalSec нет', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [timed(sq(80, 5), 40), sq(80, 5)] }], library);
    const s = out[0]!.sessions[0]!;
    expect(s.sets).toEqual([{ weight: 80, value: 5, timeSec: 40 }, { weight: 80, value: 5 }]);
    expect(s).not.toHaveProperty('totalSec');
  });

  it('невыполненный подход с метками не считается', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [timed(sq(80, 5), 40), timed(step('Присед', { completed: false }), 99)] }], library);
    expect(out[0]!.sessions[0]!.totalSec).toBe(40);
  });

  it('endedAt раньше startedAt — подход без времени', () => {
    const bad: SessionStepResult = { ...sq(80, 5), startedAt: 9000, endedAt: 1000 };
    const out = exerciseHistories([{ date: '2026-10-01', steps: [bad] }], library);
    expect(out[0]!.sessions[0]).toEqual({ date: '2026-10-01', sets: [{ weight: 80, value: 5 }] });
  });

  it('typicalSetSec — медиана по всем тренировкам, а не только по последним; один замер — поля нет', () => {
    const one = exerciseHistories([{ date: '2026-10-01', steps: [timed(sq(80, 5), 40)] }], library);
    expect(one[0]).not.toHaveProperty('typicalSetSec');
    const n = HISTORY_SESSIONS + 5;
    const heavyOld = exerciseHistories(
      Array.from({ length: n }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, steps: [timed(sq(50, 5), i < 15 ? 100 : 10)] })),
      library,
    );
    // по последним 20 медиана была бы 10 с, по всем 25 — 100 с
    expect(heavyOld[0]!.typicalSetSec).toBe(100);
  });

  it('рекорд не несёт timeSec', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [timed(sq(80, 5), 40), timed(sq(85, 5), 50)] }], library);
    expect(out[0]!.record).toEqual({ weight: 85, value: 5, date: '2026-10-01' });
  });

  it('упражнение на время: время подхода отдельно от результата', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [timed(plank(60), 65), timed(plank(45), 50)] }], library);
    expect(out[0]!.sessions[0]!.sets).toEqual([{ value: 60, timeSec: 65 }, { value: 45, timeSec: 50 }]);
  });

  it('старые итоги без меток: ни одного нового поля', () => {
    const out = exerciseHistories([{ date: '2026-10-01', steps: [sq(80, 5), sq(80, 5)] }], library);
    expect(out[0]).not.toHaveProperty('typicalSetSec');
    expect(out[0]!.sessions[0]).not.toHaveProperty('totalSec');
  });
});

describe('exerciseCommentsOf: комментарии тренера для страницы упражнения', () => {
  async function setup() {
    const db = openDb(':memory:');
    const clock = () => new Date('2026-11-03T10:00:00Z');
    const athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete', clock);
    const trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer', clock);
    db.prepare("INSERT INTO exercises (slug, name, aliases, kind, group_id, created_at) VALUES ('pushup-touch', 'Отжимания с касанием', '[\"отжимания касание\"]', 'reps', 'chest', 'z')").run();
    const add = (slug: string | null, name: string, text: string, author: number, at: string) =>
      db.prepare('INSERT INTO comments (athlete_id, author_id, exercise_slug, exercise_name, text, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(athlete, author, slug, name, text, at);
    return { db, athlete, trainer, add };
  }

  it('комментарий к видео без slug находится по названию упражнения', async () => {
    const { db, athlete, trainer, add } = await setup();
    add('pushup-touch', 'Отжимания с касанием', 'К упражнению', trainer, '2026-11-01T10:00:00Z');
    add(null, 'отжимания с касанием ', 'К видео', trainer, '2026-11-02T10:00:00Z');
    add(null, 'отжимания касание', 'По псевдониму', trainer, '2026-11-03T10:00:00Z');
    expect(exerciseCommentsOf(db, athlete)['pushup-touch']?.map((c) => c.text)).toEqual(['По псевдониму', 'К видео', 'К упражнению']);
  });

  it('ответы спортсмена и комментарии к другим упражнениям не попадают', async () => {
    const { db, athlete, trainer, add } = await setup();
    add(null, 'Отжимания с касанием', 'Мой ответ', athlete, '2026-11-02T10:00:00Z');
    add(null, 'Что-то другое', 'Чужое', trainer, '2026-11-02T10:00:00Z');
    expect(exerciseCommentsOf(db, athlete)).toEqual({});
  });
});
