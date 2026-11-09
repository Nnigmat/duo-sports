import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { buildSteps, initSession, reduce, type Action, type FinishStats } from '../flow';
import { Button } from '../../../ui/Button/Button';
import { Text } from '../../../ui/Text/Text';
import { ARTIFACT } from '../../../ui/storyKit';
import { mockCamera } from '../RecordingScreen/mockCamera';
import { COMMENTS, TECHNIQUES, WORKOUT } from './mockWorkout';
import { WorkoutFlow } from './WorkoutFlow';

const onUploadVideo = fn();
const onFinish = fn();
const onExit = fn();

type FlowProps = React.ComponentProps<typeof WorkoutFlow>;

/** Обёртка для истории: после «Отправить» или выхода показывает итог и даёт пройти заново */
function Demo(props: FlowProps) {
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  if (result) {
    return (
      <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <Text variant="h4">{result}</Text>
        <Button onClick={() => { setResult(null); setRun((n) => n + 1); }}>Пройти заново</Button>
      </div>
    );
  }
  return (
    <WorkoutFlow
      key={run}
      {...props}
      onFinish={async (s: FinishStats, steps, feedback) => {
        await props.onFinish(s, steps, feedback);
        setResult(`Сохранено: ${s.setsDone} из ${s.setsTotal} подходов, видео ${s.videos}, самочувствие ${feedback.feeling}`);
      }}
      onExit={() => {
        props.onExit();
        setResult('Вышли из тренировки');
      }}
    />
  );
}

const meta = {
  title: 'Features/Workout/WorkoutFlow',
  component: WorkoutFlow,
  args: {
    workout: WORKOUT,
    dateLabel: 'Пятница, 30 октября',
    comments: COMMENTS,
    techniques: TECHNIQUES,
    onUploadVideo,
    onFinish,
    onExit,
    recordingDelaySec: 3,
    now: new Date('2026-10-30T12:00:00'),
  },
  render: (args) => <Demo {...args} />,
  beforeEach: () => {
    onUploadVideo.mockReset().mockImplementation(() => new Promise((r) => setTimeout(r, 300)));
    onFinish.mockReset().mockResolvedValue(undefined);
    onExit.mockReset();
    return mockCamera('stream');
  },
  parameters: {
    layout: 'fullscreen',
    bleed: true,
    docs: {
      description: {
        component: `Весь сценарий на моковых данных: старт → разминка по таймеру → круги с отдыхом → запись видео на круге 2 → силовая (с «Планкой» на время) → заминка → финиш. Работают «Назад» с общим временем тренировки, «Техника», комментарии тренера и выход с подтверждением. Таймеры короткие (5 с), «Пропустить» перематывает. Камера подменена, видео «загружается» 0,3 с. ${ARTIFACT}`,
      },
    },
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof WorkoutFlow>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Пройти руками: это то, что видно в Storybook */
export const Walkthrough: Story = {};

// Ниже сценарные проверки: они проходят поток кнопками, поэтому скрыты из интерфейса, но идут в vitest.
const hidden = ['!dev', '!autodocs'];
const body = () => within(document.body);
const click = (name: string | RegExp) => userEvent.click(body().getByRole('button', { name }));

/** Запись подхода на видео до «Отправить» включительно */
async function recordAndSend() {
  await click('Начать запись');
  await waitFor(() => expect(body().getByRole('button', { name: 'Начать запись' })).toBeEnabled(), { timeout: 5000 });
  await click('Начать запись');
  await waitFor(() => expect(body().getByRole('button', { name: 'Остановить' })).toBeVisible(), { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 1300));
  await click('Остановить');
  await click('Отправить');
}

/** «Начать тренировку» и пропуск трёх упражнений разминки */
async function toCircuit() {
  await click('Начать тренировку');
  for (let i = 0; i < 3; i++) {
    // таймер разминки идёт сам
    await body().findByRole('button', { name: /Пауза, \d\d:\d\d осталось/ });
    await click('Пропустить');
  }
  await waitFor(() => expect(body().getByText('Подход 1 из 9')).toBeVisible());
}

/** «Готово» на подходе упражнения и «Записать» в шторке результата со значением из плана */
async function done() {
  await click('Готово');
  await screen.findByRole('dialog');
  await click('Записать');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

/** «Готово», «Записать» и пропуск отдыха после него */
async function doneAndSkipRest() {
  await done();
  await body().findByRole('timer', { name: /отдых/i });
  await click('Пропустить');
}

/** Прохождение, сохранённое на втором подходе круга: как после перезагрузки страницы */
const resumedSession = () =>
  (['begin', 'skip', 'skip', 'skip', 'done', 'restOver'] as const).reduce(
    (s, type) => reduce(s, { type } as Action),
    initSession(buildSteps(WORKOUT.blocks)),
  );

/** Прохождение, дошедшее до «Обратной связи» */
const finishedFeedback = () => reduce(reduce(resumedSession(), { type: 'finishNow' }), { type: 'toFeedback' });

export const Resumed: Story = {
  tags: hidden,
  args: { initialSession: resumedSession(), onSessionChange: fn() },
  play: async () => {
    // Экран старта не показываем: сразу второй подход круга, первый засчитан
    await expect(body().getByText('Подход 2 из 9')).toBeVisible();
    await expect(body().queryByRole('button', { name: 'Начать тренировку' })).toBeNull();
    // Дальше тренировка идёт как обычно
    await done();
    await body().findByRole('timer', { name: /отдых/i });
  },
};

export const FullRun: Story = {
  tags: hidden,
  args: { recordingDelaySec: 0 },
  play: async () => {
    await toCircuit();

    // Круг 1
    await doneAndSkipRest();
    await doneAndSkipRest();
    await doneAndSkipRest();

    // Круг 2: первый подход снимаем на видео
    await expect(body().getByText('Подход 4 из 9 · снимаем на видео')).toBeVisible();
    await click('Начать запись');
    await waitFor(() => expect(body().getByRole('button', { name: 'Начать запись' })).toBeEnabled(), { timeout: 5000 });
    await click('Начать запись');
    await waitFor(() => expect(body().getByRole('button', { name: 'Остановить' })).toBeVisible(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 1300));
    await click('Остановить');
    await click('Отправить');
    // после загрузки спрашиваем факт; записали, и подход выполнен, идёт отдых
    const fact = within(await screen.findByRole('dialog', { name: 'Сколько повторений сделали?' }, { timeout: 5000 }));
    await userEvent.click(fact.getByRole('button', { name: 'Записать' }));
    await body().findByRole('timer', { name: /отдых/i }, { timeout: 5000 });
    await expect(onUploadVideo).toHaveBeenCalledTimes(1);
    await click('Пропустить');
    await doneAndSkipRest();
    await doneAndSkipRest();

    // Круг 3: после последнего подхода блока отдыха нет, сразу силовая
    await doneAndSkipRest();
    await doneAndSkipRest();
    await done();

    // Силовая: приседания, затем «Планка» на время
    await expect(body().getByText('Приседания с гантелью · 12 кг × 12')).toBeVisible();
    await doneAndSkipRest();
    await doneAndSkipRest();
    await expect(body().getByText('Планка · 00:08')).toBeVisible();
    // время запускается по «Старт»
    await expect(body().queryByRole('timer')).toBeNull();
    await click('Старт');
    // после «Старт» сначала отсчёт 5 с, кольцо подписано «старт через»
    await body().findByRole('button', { name: /Пауза, 00:0[1-5] старт через/ });
    await click('Пропустить');

    // Заминка
    for (let i = 0; i < 2; i++) {
      await body().findByRole('button', { name: /Пауза, \d\d:\d\d осталось/ });
      await click('Пропустить');
    }

    // Финиш: планку пропустили, остальные 11 подходов из 12 выполнены
    await expect(await body().findByText('Тренировка пройдена')).toBeVisible();
    await expect(body().getByText('11 из 12')).toBeVisible();
    await expect(body().getByText('видео записано')).toBeVisible();
    await expect(body().getByText('общее время')).toBeVisible();
    await click('Дальше');
    await expect(await body().findByRole('heading', { name: 'Обратная связь' })).toBeVisible();
    // Без оценки отправить нельзя
    await expect(body().getByRole('button', { name: 'Выберите самочувствие' })).toBeDisabled();
    await click('Хорошо');
    await click('Отправить тренеру');
    await expect(onFinish).toHaveBeenCalledWith({ setsDone: 11, setsTotal: 12, videos: 1 }, expect.any(Array), { feeling: 4 });
    // Вместе с итогами уходит каждый подход: выполненные и пропущенная планка
    const steps = onFinish.mock.calls[0]![1] as Array<{ exerciseName: string; completed: boolean; actual?: { value: number }; plan: { target: { max: number } } }>;
    await expect(steps.some((x) => x.completed)).toBe(true);
    await expect(steps.filter((x) => !x.completed).length).toBeGreaterThan(0);
    // Факт ушёл в Итог отдельно от плана; пропущенная планка без факта; разминка без шторки и без факта
    const dips = steps.find((x) => x.exerciseName === 'Обратные отжимания')!;
    await expect(dips.actual).toEqual({ value: 20 });
    await expect(dips.plan.target.max).toBe(20);
    await expect(steps.find((x) => x.exerciseName === 'Планка')).toMatchObject({ completed: false });
    await expect('actual' in steps.find((x) => x.exerciseName === 'Планка')!).toBe(false);
    await expect('actual' in steps[0]!).toBe(false);
  },
};

export const RecordedSetAsksFact: Story = {
  tags: hidden,
  args: { recordingDelaySec: 0 },
  play: async () => {
    await toCircuit();
    await doneAndSkipRest();
    await doneAndSkipRest();
    await doneAndSkipRest();
    await recordAndSend();
    // Отдыха ещё нет: сначала факт подхода
    const dialog = within(await screen.findByRole('dialog', { name: 'Сколько повторений сделали?' }, { timeout: 5000 }));
    await expect(body().queryByRole('timer', { name: /отдых/i })).toBeNull();
    for (let i = 0; i < 2; i++) await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Записать' }));
    await body().findByRole('timer', { name: /отдых/i });
    await expect(onUploadVideo).toHaveBeenCalledTimes(1);
  },
};

export const CloseFactAfterRecordCompletesByPlan: Story = {
  tags: hidden,
  args: { recordingDelaySec: 0 },
  play: async () => {
    await toCircuit();
    await doneAndSkipRest();
    await doneAndSkipRest();
    await doneAndSkipRest();
    await recordAndSend();
    const dialog = within(await screen.findByRole('dialog', { name: 'Сколько повторений сделали?' }, { timeout: 5000 }));
    await userEvent.click(dialog.getByRole('button', { name: 'Закрыть' }));
    // Видео уже загружено: подход засчитан, идёт отдых
    await body().findByRole('timer', { name: /отдых/i });
  },
};

export const CancelRecordingKeepsSet: Story = {
  tags: hidden,
  args: { recordingDelaySec: 0 },
  play: async () => {
    await toCircuit();
    await doneAndSkipRest();
    await doneAndSkipRest();
    await doneAndSkipRest();
    await click('Начать запись');
    await click('Отмена');
    await expect(body().getByText('Подход 4 из 9 · снимаем на видео')).toBeVisible();
    await expect(screen.queryByRole('dialog')).toBeNull();
    await expect(onUploadVideo).not.toHaveBeenCalled();
  },
};

export const RestIsAboutNextSet: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    await done();
    await expect(await body().findByText('Отдых · далее подход 2 из 9')).toBeVisible();
    await expect(body().getByText('Ножницы лёжа · 30–34 повт')).toBeVisible();
    await expect(body().getByRole('button', { name: 'Запись' })).toBeDisabled();
    // Отдых считает вверх до цели, «+15 с» двигает цель
    await expect(body().getByRole('timer', { name: /из 00:05/ })).toBeVisible();
    await click('Добавить 15 секунд');
    await waitFor(() => expect(body().getByRole('timer', { name: /из 00:20/ })).toBeVisible());
    // Над персонажем облачко с позой следующего упражнения
    await expect(document.querySelector('[data-pose="scissors"]')).not.toBeNull();
  },
};

/** Цель отдыха (в моке 5 с) достигнута: круг становится кнопкой «Начать», она ведёт к следующему подходу */
export const RestOverStartsNextSet: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    await done();
    await expect(await body().findByText('Отдых · далее подход 2 из 9')).toBeVisible();
    // Цель в моке 5 с: круг сам превращается в кнопку
    await userEvent.click(await body().findByRole('button', { name: /отдыхаете.*Начать/ }, { timeout: 8000 }));
    await expect(await body().findByText('Подход 2 из 9')).toBeVisible();
  },
};

export const FactDoesNotChangePlan: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    await click('Готово');
    const dialog = within(await screen.findByRole('dialog', { name: 'Сколько повторений сделали?' }));
    // Степпер стоит на верхней границе плана 18–20
    await expect(dialog.getByText('План: 18–20')).toBeVisible();
    for (let i = 0; i < 3; i++) await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await expect(dialog.getByText('Меньше плана')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Записать' }));
    await body().findByRole('timer', { name: /отдых/i });
    await click('Пропустить');
    // Следующие круги того же упражнения остались с планом 18–20
    await doneAndSkipRest();
    await doneAndSkipRest();
    await expect(await body().findByText('Обратные отжимания · 18–20 повт')).toBeVisible();
  },
};

export const CloseResultSheetSavesNothing: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    await click('Готово');
    const dialog = within(await screen.findByRole('dialog', { name: 'Сколько повторений сделали?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Закрыть' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Подход не засчитан: отдыха нет, мы всё на первом подходе
    await expect(body().queryByRole('timer')).toBeNull();
    await expect(body().getByText('Подход 1 из 9')).toBeVisible();
    await expect(body().getByRole('button', { name: 'Готово' })).toBeVisible();
  },
};

export const RedoneFactIsOverwritten: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    await click('Готово');
    const first = within(await screen.findByRole('dialog', { name: 'Сколько повторений сделали?' }));
    for (let i = 0; i < 3; i++) await userEvent.click(first.getByRole('button', { name: 'Меньше повторений' }));
    await userEvent.click(first.getByRole('button', { name: 'Записать' }));
    await body().findByRole('timer', { name: /отдых/i });

    // «Назад» с отдыха, снова «Готово»: шторка открыта с введённым фактом (17), а не с планом
    await click('Шаг назад');
    await click('Готово');
    const second = within(await screen.findByRole('dialog', { name: 'Сколько повторений сделали?' }));
    await expect(second.getByText('Меньше плана')).toBeVisible();
    await userEvent.click(second.getByRole('button', { name: 'Больше повторений' }));
    await expect(second.getByText('В плане')).toBeVisible();
    await userEvent.click(second.getByRole('button', { name: 'Записать' }));
    await body().findByRole('timer', { name: /отдых/i });
  },
};

/** «Назад» возвращает на предыдущий подход, пропуская отдых; на первом шаге кнопки нет */
export const BackReturnsToPreviousSet: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    // Первый подход круга: «Назад» есть (шаг не первый), стрелки в шапке нет
    await expect(body().queryByRole('button', { name: 'Шаг назад' })).toBeNull();
    await doneAndSkipRest();
    await expect(body().getByText('Подход 2 из 9')).toBeVisible();
    await click('Назад');
    await expect(await body().findByText('Подход 1 из 9')).toBeVisible();
    await expect(body().queryByRole('timer', { name: /отдых/i })).toBeNull();
  },
};

/** Общее время идёт под названием круга от метки старта */
export const ShowsElapsedTime: Story = {
  tags: hidden,
  args: { initialSession: resumedSession(), startedAt: Date.now() - 3_725_000 },
  play: async () => {
    await expect(body().getByRole('timer', { name: 'Время тренировки' })).toHaveTextContent(/^1:02:\d\d$/);
  },
};

export const TechAndCommentsMarkRead: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    // к отжиманиям есть непрочитанный комментарий: на кнопке точка
    await click('Техника, новый комментарий тренера');
    const tech = within(await screen.findByRole('dialog', { name: 'Обратные отжимания' }));
    await expect(tech.getByText('Новый')).toBeVisible();
    await userEvent.click(tech.getByRole('button', { name: /Все комментарии · 5/ }));

    const comments = within(await screen.findByRole('dialog', { name: 'Комментарии тренера' }));
    await expect(comments.getAllByRole('listitem')).toHaveLength(5);
    // «Назад» возвращает к технике
    await userEvent.click(comments.getByRole('button', { name: 'Назад' }));
    const again = within(await screen.findByRole('dialog', { name: 'Обратные отжимания' }));
    await userEvent.click(again.getByRole('button', { name: 'Закрыть' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // после закрытия комментарии прочитаны: точки нет
    await expect(body().getByRole('button', { name: 'Техника' })).toBeVisible();
    await expect(body().queryByRole('button', { name: 'Техника, новый комментарий тренера' })).toBeNull();
  },
};

/** Ошибка сети: оценка и комментарий остаются, повтор уходит с теми же данными, ключ и итог не задваиваются на странице-контейнере */
export const RetryAfterNetworkError: Story = {
  tags: hidden,
  args: { initialSession: finishedFeedback() },
  play: async () => {
    onFinish.mockReset().mockRejectedValueOnce(new Error('Нет связи с сервером')).mockResolvedValue(undefined);
    await click('Отлично');
    await userEvent.type(body().getByLabelText('Комментарий к тренировке'), 'легко');
    await click('Отправить тренеру');
    await expect(await body().findByRole('alert')).toHaveTextContent('Нет связи с сервером');
    // Экран и введённое на месте, кнопка снова доступна
    await expect(body().getByRole('button', { name: 'Отлично' })).toHaveAttribute('aria-pressed', 'true');
    await expect(body().getByLabelText('Комментарий к тренировке')).toHaveValue('легко');
    await click('Отправить тренеру');
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(2));
    await expect(onFinish.mock.calls[1]![2]).toEqual({ feeling: 5, comment: 'легко' });
  },
};

/** Прохождение, закрытое на «Обратной связи»: после открытия сразу этот экран, стрелка ведёт к итогам */
export const ResumedOnFeedback: Story = {
  tags: hidden,
  args: { initialSession: finishedFeedback() },
  play: async () => {
    await expect(body().getByRole('heading', { name: 'Обратная связь' })).toBeVisible();
    await click('К итогам');
    await expect(await body().findByText('Тренировка пройдена')).toBeVisible();
    await click('Дальше');
    await expect(await body().findByRole('heading', { name: 'Обратная связь' })).toBeVisible();
  },
};

export const ExitFinishesWithWhatIsDone: Story = {
  tags: hidden,
  play: async () => {
    await toCircuit();
    await doneAndSkipRest();
    await click('Закончить тренировку');
    const dialog = within(await screen.findByRole('dialog', { name: 'Закончить тренировку?' }));
    await waitFor(() => expect(dialog.getByText('Выполненные подходы сохранятся')).toBeVisible());
    await userEvent.click(dialog.getByRole('button', { name: 'Закончить' }));
    await expect(await body().findByText('Тренировка пройдена')).toBeVisible();
    await expect(body().getByText('1 из 12')).toBeVisible();
  },
};

export const BackGoesToStart: Story = {
  tags: hidden,
  play: async () => {
    await click('Начать тренировку');
    await click('Шаг назад');
    await expect(await body().findByRole('heading', { name: 'Круговая тренировка' })).toBeVisible();
    await click('Шаг назад');
    await expect(onExit).toHaveBeenCalledTimes(1);
  },
};
