import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Block } from '../../../../../shared/types';
import { toLibraryExercise } from '../../exercises/api';
import { WorkoutEditView } from './WorkoutEditView';

const library = [
  { id: 'bench-press', name: 'Жим лёжа', aliases: [], kind: 'weight' as const, group: 'chest' as const, muscles: ['грудь'], equipment: ['Штанга'] },
  { id: 'dips', name: 'Отжимания на брусьях', aliases: ['брусья'], kind: 'reps' as const, group: 'arms' as const, muscles: ['трицепс'], equipment: [] },
].map(toLibraryExercise);

const blocks: Block[] = [
  {
    id: 'b1',
    mode: 'sets',
    title: 'Подходами',
    restSec: 90,
    videoRounds: [],
    exercises: [
      { id: 'x1', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 4 },
      { id: 'x2', name: 'Жим узкий', kind: 'weight', target: { min: 10, max: 10 }, weight: 40, sets: 3 },
    ],
  },
];

const meta = {
  title: 'Features/Trainer/WorkoutEditView',
  component: WorkoutEditView,
  globals: { viewport: { value: 'a15', isRotated: false } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    view: 'form',
    yaml: { text: '', issues: [], onText: fn() },
    onView: fn(),
    title: 'Верх тела',
    blocks,
    library,
    saving: false,
    issues: [],
    failure: null,
    onTitle: fn(),
    onBlocks: fn(),
    onSave: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof WorkoutEditView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Edit: Story = {
  args: { routines: { warmup: { id: 'neck-shoulders', title: 'Шея и плечи' } } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('tablist', { name: 'Как править' })).toBeVisible();
    await expect(c.getByText(/Изменения увидят все дни плана/)).toBeVisible();
    await expect(c.queryByText('новое')).toBeNull();
  },
};

export const CreateMode: Story = {
  args: {
    mode: 'create',
    newNames: new Set(['Жим узкий']),
    onOpenNew: fn(),
    saveLabel: 'Сохранить в план',
    topSlot: <p>Заметки агента</p>,
    warmupSlot: <p>Слот разминки</p>,
    routines: { warmup: { id: 'neck-shoulders', title: 'Шея и плечи' } },
  },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole('tablist', { name: 'Как править' })).toBeNull();
    await expect(c.queryByText(/Изменения увидят все дни плана/)).toBeNull();
    await expect(c.getByText('новое')).toBeVisible();
    await expect(c.getByText('Заметки агента')).toBeVisible();
    await expect(c.getByText('Слот разминки')).toBeVisible();
    await expect(c.queryByText('Подключена ссылкой')).toBeNull();
    await expect(c.getByRole('button', { name: 'Сохранить в план' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Открыть «Жим узкий»' }));
    await expect(args.onOpenNew).toHaveBeenCalledWith('Жим узкий');
  },
};

export const CreateFromSearch: Story = {
  args: { mode: 'create', onCreateExercise: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Добавить упражнение' }));
    const sheet = within(document.body);
    await userEvent.type(await sheet.findByLabelText('Поиск упражнения'), 'Отжимания с хлопком');
    await userEvent.click(sheet.getByRole('button', { name: 'Создать „Отжимания с хлопком“' }));
    await expect(args.onCreateExercise).toHaveBeenCalledWith('b1', 'Отжимания с хлопком');
  },
};

const v2Blocks: Block[] = [
  {
    id: 'b1',
    mode: 'sets',
    title: 'Подходами',
    restSec: 90,
    videoRounds: [],
    exercises: [
      { id: 'x1', name: 'Подтягивания', kind: 'reps', target: { min: 0, max: 0 }, sets: 3, restSec: 180, note: 'Без раскачки' },
      { id: 'x2', name: 'Планка', kind: 'time', target: { min: 0, max: 0 }, sets: 2 },
      { id: 'x3', name: 'Наклоны', kind: 'time', target: { min: 30, max: 30 }, sets: 2, sides: ['влево', 'вправо'] },
    ],
  },
  { id: 'b2', mode: 'circuit', title: 'По кругу', rounds: 3, restSec: 60, restAfter: 'round', videoRounds: [], exercises: [{ id: 'x4', name: 'Отжимания', kind: 'reps', target: { min: 10, max: 10 } }] },
];

export const WithNotesAndRest: Story = {
  args: { blocks: v2Blocks, notes: 'Рабочих отжиманий сегодня нет', onNotes: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText('Заметка к тренировке')).toHaveValue('Рабочих отжиманий сегодня нет');
    await expect(c.getAllByLabelText('Заметка')[0]).toHaveValue('Без раскачки');
    await expect(c.getAllByRole('checkbox', { name: /На максимум/ })).toHaveLength(4);
    await expect(c.getAllByRole('checkbox', { name: /На максимум/ })[0]).toBeChecked();
    await expect(c.getAllByRole('checkbox', { name: /На максимум/ })[2]).not.toBeChecked();
    await expect(c.getByText('На сторону: влево, вправо')).toBeVisible();
    await expect(c.getByText('Отдых после круга')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Наклоны: убрать стороны' }));
    const next = (args.onBlocks as ReturnType<typeof fn>).mock.calls.at(-1)?.[0] as Block[];
    await expect(next[0]).not.toHaveProperty('exercises.2.sides');
  },
};

export const NoteBlock: Story = {
  args: { blocks: [...blocks, { id: 'b2', mode: 'note', title: 'Замер', text: 'Сделайте контрольный замер талии' }] },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText('Название блока 2')).toHaveValue('Замер');
    await expect(c.getByLabelText('Текст заметки 2')).toHaveValue('Сделайте контрольный замер талии');
    await userEvent.click(c.getAllByRole('button', { name: 'Блок выше' })[1]!);
    await expect(args.onBlocks).toHaveBeenCalled();
  },
};
