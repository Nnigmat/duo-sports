import { describe, expect, it } from 'vitest';
import type { SessionStepResult } from '../shared/types';
import { buildAchievements, completeWeeks, dateLabel, recordPoints, streakPoints, tiersFrom, type AchievementSession } from './achievements';

const step = (over: Partial<SessionStepResult> = {}): SessionStepResult => ({
  exerciseId: 'e1', exerciseName: 'Присед', blockIndex: 0, round: 1, rounds: 3, kind: 'weight',
  plan: { target: { min: 10, max: 10 }, weight: 60 }, completed: true, ...over,
});
const session = (date: string, over: Partial<AchievementSession> = {}): AchievementSession => ({ workoutId: 1, date, steps: [step()], videos: 0, hasCircuit: false, ...over });
const find = (data: ReturnType<typeof buildAchievements>, id: string) => data.categories.flatMap((c) => c.items).find((i) => i.id === id)!;

describe('achievements', () => {
  it('dateLabel', () => expect(dateLabel('2026-10-26')).toBe('26 окт'));

  it('tiersFrom: даты по первому достижению порога', () => {
    const pts = [{ date: '2026-10-01', value: 5 }, { date: '2026-10-05', value: 12 }, { date: '2026-10-09', value: 60 }];
    expect(tiersFrom(pts, [10, 50, 100])).toEqual({ tier: 2, earnedDates: ['5 окт', '9 окт'] });
    expect(tiersFrom([], [1, 2, 3])).toEqual({ tier: 0, earnedDates: [] });
  });

  it('пустые данные дают нули и нулевые уровни', () => {
    const data = buildAchievements({ today: '2026-11-04', entries: [], sessions: [] });
    for (const i of data.categories.flatMap((c) => c.items).filter((i) => !i.secret)) {
      expect(i.tier).toBe(0);
      expect(i.current).toBe(0);
    }
    expect(find(data, 'secret').secret).toBe(true);
  });

  it('тренировки, объём, тоннаж и видео', () => {
    const sessions = [session('2026-10-01', { videos: 1 }), session('2026-10-02', { videos: 2, steps: [step({ plan: { target: { min: 10, max: 10 }, weight: 100 } }), step({ completed: false })] })];
    const data = buildAchievements({ today: '2026-11-04', entries: [], sessions });
    expect(find(data, 'workouts').current).toBe(2);
    expect(find(data, 'heavy-day')).toMatchObject({ current: 1000, tier: 1, earnedDates: ['2 окт'] });
    expect(find(data, 'tonnage').current).toBe(1.6);
    expect(find(data, 'on-video')).toMatchObject({ current: 3, tier: 1, earnedDates: ['1 окт'] });
  });

  it('круговые считаются только при полном выполнении', () => {
    const sessions = [session('2026-10-01', { hasCircuit: true }), session('2026-10-02', { hasCircuit: true, steps: [step(), step({ completed: false })] })];
    expect(find(buildAchievements({ today: '2026-11-04', entries: [], sessions }), 'circuits')).toMatchObject({ current: 1, tier: 1 });
  });

  it('рекорды: первое выполнение не рекорд, только превышение прошлого веса', () => {
    const w = (kg: number) => [step({ plan: { target: { min: 5, max: 5 }, weight: kg } })];
    const pts = recordPoints([session('2026-10-01', { steps: w(50) }), session('2026-10-02', { steps: w(55) }), session('2026-10-03', { steps: w(55) }), session('2026-10-04', { steps: w(60) })]);
    expect(pts.map((p) => p.value)).toEqual([0, 1, 1, 2]);
  });

  it('недели и серия', () => {
    // недели с 2026-10-12, 10-19, (пропуск 10-26), 11-02
    const entries = [
      { date: '2026-10-12', workoutId: 1 }, { date: '2026-10-19', workoutId: 1 }, { date: '2026-10-26', workoutId: 1 }, { date: '2026-11-02', workoutId: 1 },
    ];
    const sessions = [session('2026-10-12'), session('2026-10-19'), session('2026-11-02')];
    const weeks = completeWeeks(entries, sessions);
    expect(weeks.map((w) => w.week)).toEqual(['2026-10-12', '2026-10-19', '2026-11-02']);
    expect(streakPoints(weeks).map((p) => p.value)).toEqual([1, 2, 1]);
    const data = buildAchievements({ today: '2026-11-04', entries, sessions });
    expect(find(data, 'no-skips')).toMatchObject({ current: 1, tier: 0 });
    expect(find(data, 'full-week')).toMatchObject({ current: 3, tier: 1, earnedDates: ['12 окт'] });
  });
});
