import { describe, expect, it } from 'vitest';
import type { AthleteRow } from '../../../../shared/types';
import { avatarTone, badgeText, emptyText, FILTERS, goalText, initials, lastText, summaryText, weekAria, weekText } from './students';

const NB = '\u00a0';
const row = (over: Partial<AthleteRow> = {}): AthleteRow => ({
  id: 1,
  name: 'Никита Н.',
  email: 'n@example.com',
  goal: 'Сила',
  lastSession: { date: '2026-11-02', title: 'Всё тело' },
  done7: 4,
  planned7: 4,
  status: 'ok',
  waitingSessions: 0,
  waitingVideos: 0,
  daysSinceLast: 1,
  ...over,
});

describe('initials', () => {
  it('две первые буквы имени и фамилии', () => {
    expect(initials('Никита Н.')).toBe('НН');
    expect(initials('алексей петров')).toBe('АП');
  });
  it('одно слово: одна буква; пусто: знак вопроса не нужен', () => {
    expect(initials('Дмитрий')).toBe('Д');
    expect(initials('  ')).toBe('');
  });
  it('без имени берём почту', () => {
    expect(initials('n@example.com')).toBe('N');
  });
});

describe('badgeText', () => {
  it('ждут разбора: видео важнее тренировок', () => {
    expect(badgeText(row({ status: 'review', waitingVideos: 2, waitingSessions: 1 }))).toBe(`2${NB}видео ждут разбора`);
    expect(badgeText(row({ status: 'review', waitingVideos: 1 }))).toBe(`1${NB}видео ждёт разбора`);
    expect(badgeText(row({ status: 'review', waitingVideos: 21 }))).toBe(`21${NB}видео ждёт разбора`);
  });
  it('без видео: тренировки, склонение и согласование глагола', () => {
    expect(badgeText(row({ status: 'review', waitingSessions: 1 }))).toBe(`1${NB}тренировка ждёт разбора`);
    expect(badgeText(row({ status: 'review', waitingSessions: 3 }))).toBe(`3${NB}тренировки ждут разбора`);
    expect(badgeText(row({ status: 'review', waitingSessions: 5 }))).toBe(`5${NB}тренировок ждут разбора`);
  });
  it('пропадает: дни без тренировок', () => {
    expect(badgeText(row({ status: 'inactive', daysSinceLast: 10 }))).toBe(`10${NB}дней без тренировок`);
    expect(badgeText(row({ status: 'inactive', daysSinceLast: 21 }))).toBe(`21${NB}день без тренировок`);
    expect(badgeText(row({ status: 'inactive', daysSinceLast: 7 }))).toBe(`7${NB}дней без тренировок`);
    expect(badgeText(row({ status: 'inactive', daysSinceLast: null, lastSession: null }))).toBe('Тренировок ещё не было');
  });
  it('по плану', () => {
    expect(badgeText(row())).toBe('Всё по плану');
  });
});

describe('lastText', () => {
  const today = '2026-11-03';
  it('сегодня, вчера и дата с названием дня недели', () => {
    expect(lastText({ date: '2026-11-03', title: 'Спина' }, today)).toBe('Сегодня · Спина');
    expect(lastText({ date: '2026-11-02', title: 'Всё тело' }, today)).toBe('Вчера · Всё тело');
    expect(lastText({ date: '2026-10-23', title: 'Всё тело' }, today)).toBe('Пт, 23 окт · Всё тело');
  });
  it('тренировок не было', () => {
    expect(lastText(null, today)).toBe('Тренировок ещё не было');
  });
});

describe('goalText, weekText, weekAria', () => {
  it('цель показываем как есть, без неё подпись', () => {
    expect(goalText('Сила · 4 дня в неделю')).toBe('Сила · 4 дня в неделю');
    expect(goalText(null)).toBe('Цель не задана');
    expect(goalText('  ')).toBe('Цель не задана');
  });
  it('«N из M» и подпись полоски', () => {
    expect(weekText(row({ done7: 3, planned7: 4 }))).toBe('3 из 4');
    expect(weekAria(row({ done7: 3, planned7: 4 }))).toBe('Никита Н.: 3 из 4 тренировок за 7 дней');
  });
  it('в плане ничего не стояло', () => {
    expect(weekText(row({ done7: 0, planned7: 0 }))).toBe('нет в плане');
  });
});

describe('summaryText', () => {
  it('число учеников и сколько ждут разбора', () => {
    expect(summaryText({ all: 3, review: 2, inactive: 1, ok: 0 })).toBe(`3${NB}ученика · 2${NB}ждут разбора`);
    expect(summaryText({ all: 1, review: 1, inactive: 0, ok: 0 })).toBe(`1${NB}ученик · 1${NB}ждёт разбора`);
    expect(summaryText({ all: 5, review: 0, inactive: 0, ok: 5 })).toBe(`5${NB}учеников`);
    expect(summaryText({ all: 0, review: 0, inactive: 0, ok: 0 })).toBe('Учеников пока нет');
  });
});

describe('avatarTone, FILTERS', () => {
  it('оттенок зависит от статуса и не только от цвета: его дублирует бейдж', () => {
    expect(avatarTone('review')).toBe('primary');
    expect(avatarTone('inactive')).toBe('highlight');
    expect(avatarTone('ok')).toBe('neutral');
  });
  it('фильтры по порядку макета', () => {
    expect(FILTERS.map((f) => f.label)).toEqual(['Все', 'Ждут разбора', 'Пропадают', 'По плану']);
  });
});

describe('emptyText', () => {
  it('поиск важнее фильтра', () => {
    expect(emptyText('review', 'Ян').title).toBe('Никого не нашли');
  });
  it('по фильтрам', () => {
    expect(emptyText('review', '').title).toBe('Разбирать нечего');
    expect(emptyText('inactive', '').title).toBe('Никто не пропал');
    expect(emptyText('all', '   ').title).toBe('Ни одного ученика не добавлено');
  });
});
