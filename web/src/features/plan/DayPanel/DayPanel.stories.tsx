import { useReducer, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { planFixture } from '../../../data/fixtures';
import { initialPlanState, planReducer } from '../plan';
import { DayPanel } from './DayPanel';

const meta = {
  title: 'Features/Plan/DayPanel',
  component: DayPanel,
  args: {
    data: planFixture,
    date: '2026-10-31',
    copyOpen: false,
    copyDate: null,
    notice: null,
    onStart: fn(),
    onResults: fn(),
    onOpenReview: fn(),
    onMove: fn(),
    onEdit: fn(),
    onRemove: fn(),
    onCreate: fn(),
    onAdd: fn(),
    onToggleCopy: fn(),
    onCopyDate: fn(),
    onCopy: fn(),
    onOpenCopied: fn(),
  },
  decorators: [(Story) => <div style={{ maxWidth: 380 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Артборды «Десктоп · План», «…пустой день» и «…копия тренировки» (правая карточка).' } } },
} satisfies Meta<typeof DayPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Today: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Ноги и ягодицы' })).toBeVisible();
    await expect(c.getByText('Сегодня · Суббота, 31 октября')).toBeVisible();
    await expect(c.getByText('Сегодня', { selector: 'span' })).toBeVisible();
    await expect(c.getByText('5 упражнений · ≈ 50 мин')).toBeVisible();
    await expect(c.getAllByRole('listitem')).toHaveLength(5);
    await expect(c.queryByRole('button', { name: 'Убрать' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Начать' }));
    await userEvent.click(c.getByRole('button', { name: 'Перенести' }));
    await userEvent.click(c.getByRole('button', { name: 'Изменить' }));
    await expect(args.onStart).toHaveBeenCalledWith('2026-10-31');
    await expect(args.onMove).toHaveBeenCalledWith('2026-10-31');
    await expect(args.onEdit).toHaveBeenCalledWith('2026-10-31');
  },
};
export const Planned: Story = {
  args: { date: '2026-11-02' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Запланирована')).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Начать' })).toBeNull();
    await expect(c.getByRole('button', { name: 'Перенести' })).toBeVisible();
  },
};
export const Done: Story = {
  args: { date: '2026-10-26' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Выполнена')).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Изменить' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Посмотреть итоги' }));
    await expect(args.onResults).toHaveBeenCalledWith('2026-10-26');
  },
};
export const DoneWithReview: Story = {
  args: {
    date: '2026-10-26',
    data: { ...planFixture, entries: { ...planFixture.entries, '2026-10-26': { ...planFixture.entries['2026-10-26']!, sessionId: 7 } } },
  },
  play: async ({ canvasElement, args }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Посмотреть разбор' });
    await expect(link).toHaveAttribute('href', '/review/7');
    await userEvent.click(link);
    await expect(args.onOpenReview).toHaveBeenCalledWith(7);
  },
};
export const Moved: Story = {
  args: { date: '2026-10-29' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Перенесена на 31 октября')).toBeVisible();
  },
};
export const MovedHere: Story = {
  args: {
    date: '2026-11-02',
    data: {
      ...planFixture,
      entries: { ...planFixture.entries, '2026-11-02': { templateId: planFixture.templates[0]!.id, status: 'planned', custom: true, movedFrom: 'пт' } },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Запланирована · перенесена со пт/)).toBeVisible();
  },
};
export const Skipped: Story = {
  args: { date: '2026-10-11' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Пропущена')).toBeVisible();
    await expect(c.getByRole('button', { name: 'Копировать' })).toBeVisible();
  },
};
export const CustomCanBeRemoved: Story = {
  args: {
    data: { ...planFixture, entries: { ...planFixture.entries, '2026-11-03': { templateId: 'legs', status: 'planned', custom: true } } },
    date: '2026-11-03',
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Убрать' }));
    await expect(args.onRemove).toHaveBeenCalledWith('2026-11-03');
  },
};
export const CopyOpen: Story = {
  args: { copyOpen: true, copyDate: '2026-11-03' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Копировать' })).toHaveAttribute('aria-expanded', 'true');
    await expect(c.getByRole('group', { name: 'Копировать на другую дату' })).toBeVisible();
  },
};
const maria = { id: 2, name: 'Маша' };
/** План Маши: на 3 ноября у неё уже стоит своя тренировка */
const mariaPlan = { ...planFixture, templates: [{ ...planFixture.templates[0]!, id: 'm1', title: 'Спина Маши' }], entries: { '2026-11-03': { templateId: 'm1', status: 'planned' as const, custom: true } } };
export const CopyToAthleteWarnsAboutTheirDay: Story = {
  args: { copyOpen: true, copyDate: '2026-11-03', copyAthletes: [maria], targetPlan: mariaPlan },
  render: (args) => {
    const [target, setTarget] = useState<number | null>(null);
    return <DayPanel {...args} onCopyTarget={setTarget} targetPlan={target === maria.id ? mariaPlan : null} />;
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByLabelText('Кому'), 'Маша');
    await expect(c.getByText(/«Спина Маши»/)).toBeVisible();
    await expect(c.getByRole('button', { name: 'Заменить копией' })).toBeEnabled();
    await userEvent.selectOptions(c.getByLabelText('Кому'), 'Этому ученику');
    await expect(c.queryByText(/«Спина Маши»/)).toBeNull();
  },
};
export const Copied: Story = {
  args: { notice: { to: '2026-11-03', title: 'Ноги и ягодицы' } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/скопирована на вторник, 3 ноября/)).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Открыть день' }));
    await expect(args.onOpenCopied).toHaveBeenCalled();
  },
};
export const EmptyFuture: Story = {
  args: { date: '2026-11-03' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Ничего не запланировано' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Создать тренировку' }));
    await expect(args.onCreate).toHaveBeenCalledWith('2026-11-03');
    await userEvent.click(c.getByRole('button', { name: /Верх тела/ }));
    await expect(args.onAdd).toHaveBeenCalledWith('2026-11-03', 'upper');
  },
};
export const EmptyPast: Story = {
  args: { date: '2026-10-27' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Тренировки не было' })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Записать тренировку' })).toBeVisible();
  },
};

function Live() {
  const [s, dispatch] = useReducer(planReducer, initialPlanState(planFixture.today));
  return (
    <DayPanel
      {...meta.args}
      copyOpen={s.copyOpen}
      copyDate={s.copyDate}
      notice={s.notice}
      onToggleCopy={() => dispatch({ type: 'toggleCopy' })}
      onCopyDate={(date) => dispatch({ type: 'copyDate', date })}
      onCopy={(to) => dispatch({ type: 'copied', to, title: 'Ноги и ягодицы' })}
      onOpenCopied={() => dispatch({ type: 'openCopied' })}
    />
  );
}
export const InteractiveCopy: Story = {
  render: () => <Live />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Копировать' }));
    await userEvent.click(c.getByRole('button', { name: /^Через неделю/ }));
    await userEvent.click(c.getByRole('button', { name: /Создать копию|Заменить копией/ }));
    await expect(c.getByText(/скопирована на/)).toBeVisible();
    await expect(c.queryByRole('group', { name: 'Копировать на другую дату' })).toBeNull();
  },
};

export const TwoWorkoutsInDay: Story = {
  args: {
    date: '2026-11-05',
    data: { ...planFixture, entries: { ...planFixture.entries, '2026-11-05': { templateId: 'legs', status: 'planned', custom: true, more: ['Всё тело'] } } },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Ещё в этот день: Всё тело')).toBeVisible();
  },
};
