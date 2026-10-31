// Только для историй: данные из макета «Комментарии тренера» и «Техника»
import type { CoachComment, Technique } from '../../../../../shared/types';

export const DIPS = { id: 'dips', name: 'Обратные отжимания' };

export const COMMENTS: CoachComment[] = [
  { id: '1', exerciseId: 'dips', exerciseName: DIPS.name, createdAt: '2026-10-28T10:00:00', isNew: true, text: 'В нижней точке таз уходит вперёд — держите его ближе к лавочке. Локти направляйте строго назад, а не в стороны.', video: { id: 'v1', label: 'Видео · круг 2, подход 4' } },
  { id: '2', exerciseId: 'lunge', exerciseName: 'Выпады', createdAt: '2026-10-28T09:00:00', isNew: true, text: 'Колено передней ноги уходит внутрь — держите его над стопой.', video: { id: 'v2', label: 'Видео · круг 2, подход 6' } },
  { id: '3', exerciseId: 'scissors', exerciseName: 'Ножницы', createdAt: '2026-10-25T10:00:00', isNew: false, text: 'Поясница отрывается от пола. Прижмите её и поднимите ноги чуть выше.' },
  { id: '4', exerciseId: 'dips', exerciseName: DIPS.name, createdAt: '2026-10-21T10:00:00', isNew: false, text: 'Амплитуда стала лучше. Попробуйте задерживаться внизу на 1 секунду.' },
  { id: '5', exerciseId: 'dips', exerciseName: DIPS.name, createdAt: '2026-10-14T10:00:00', isNew: false, text: 'На последних повторах руки не сгибаются до конца. Лучше 16 полных движений, чем 20 неполных.', video: { id: 'v5', label: 'Видео · круг 2, подход 4' } },
  { id: '6', exerciseId: null, exerciseName: 'Тренировка', createdAt: '2026-10-10T10:00:00', isNew: false, text: 'Отдых затягивается — держите 60 секунд между подходами.' },
  { id: '7', exerciseId: 'dips', exerciseName: DIPS.name, createdAt: '2026-10-07T10:00:00', isNew: false, text: 'Плечи поднимаются к ушам — опустите их и держите шею длинной.' },
  { id: '8', exerciseId: 'dips', exerciseName: DIPS.name, createdAt: '2026-09-30T10:00:00', isNew: false, text: 'Хорошее начало. Ладони ставьте на ширине таза, пальцами вперёд.' },
];

export const TECHNIQUE: Technique = {
  instructions: [
    'Упритесь ладонями в край лавочки за спиной, ноги впереди.',
    'Опускайтесь, сгибая руки до конца, и выпрямляйте обратно.',
    'Таз неподвижен — работают только руки.',
  ],
  mistake: 'таз опускается вниз вместо сгибания рук.',
};

/** Фиксированная «сегодня» для дат в историях */
export const NOW = new Date('2026-10-30T12:00:00');
