import type { ExerciseKind, LibraryEntry, MuscleGroupId } from '../shared/types';

/** Упражнения, с которыми начинает каждый новый пользователь. Добавлять сюда новые можно свободно: они появятся только у тех, у кого библиотека ещё пуста. */
const e = (id: string, name: string, group: MuscleGroupId, kind: ExerciseKind, muscles: string[], aliases: string[] = []): LibraryEntry => ({
  id,
  name,
  group,
  kind,
  muscles,
  aliases,
});

export const DEFAULT_EXERCISES: LibraryEntry[] = [
  e('barbell-squat', 'Приседания со штангой', 'legs', 'weight', ['квадрицепс', 'ягодицы'], ['присед']),
  e('romanian-deadlift', 'Румынская тяга', 'legs', 'weight', ['бицепс бедра', 'ягодицы'], ['РДЛ']),
  e('leg-press', 'Жим ногами', 'legs', 'weight', ['квадрицепс', 'ягодицы']),
  e('dumbbell-lunge', 'Выпады с гантелями', 'legs', 'weight', ['квадрицепс', 'ягодицы'], ['выпады']),
  e('leg-curl', 'Сгибания ног лёжа', 'legs', 'weight', ['бицепс бедра']),
  e('calf-raise', 'Подъёмы на носки', 'legs', 'weight', ['икры']),
  e('deadlift', 'Становая тяга', 'legs', 'weight', ['спина', 'бицепс бедра', 'ягодицы'], ['становая']),
  e('glute-bridge', 'Ягодичный мост', 'legs', 'weight', ['ягодицы'], ['ягодичный мостик', 'мостик']),
  e('hyperextension', 'Гиперэкстензия', 'back', 'reps', ['поясница', 'ягодицы']),
  e('lat-pulldown', 'Тяга верхнего блока', 'back', 'weight', ['широчайшие', 'бицепс']),
  e('seated-row', 'Тяга горизонтального блока', 'back', 'weight', ['спина']),
  e('pull-up', 'Подтягивания', 'back', 'reps', ['широчайшие', 'бицепс']),
  e('barbell-row', 'Тяга штанги в наклоне', 'back', 'weight', ['спина']),
  e('bench-press', 'Жим лёжа', 'chest', 'weight', ['грудь', 'трицепс'], ['жим штанги лёжа']),
  e('incline-press', 'Жим на наклонной скамье', 'chest', 'weight', ['грудь', 'плечи']),
  e('dumbbell-fly', 'Разведения гантелей', 'chest', 'weight', ['грудь']),
  e('push-up', 'Отжимания', 'chest', 'reps', ['грудь', 'трицепс']),
  e('dips', 'Отжимания на брусьях', 'arms', 'reps', ['трицепс', 'грудь'], ['брусья']),
  e('biceps-curl', 'Сгибания на бицепс', 'arms', 'weight', ['бицепс']),
  e('french-press', 'Французский жим', 'arms', 'weight', ['трицепс']),
  e('plank', 'Планка', 'core', 'time', ['пресс', 'кор']),
  e('crunch', 'Скручивания', 'core', 'reps', ['пресс']),
  e('leg-raise', 'Подъём ног в висе', 'core', 'reps', ['пресс']),
  e('jump-rope', 'Скакалка', 'cardio', 'time', ['выносливость']),
];
