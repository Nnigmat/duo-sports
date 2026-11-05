import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { exerciseLibrary } from '../mock';
import { ExercisesFlow } from './ExercisesFlow';

const meta = {
  title: 'Features/Exercises/ExercisesFlow',
  component: ExercisesFlow,
  args: { initial: exerciseLibrary },
  parameters: { docs: { description: { component: 'Все мобильные экраны вкладки «Упражнения» в одном сценарии, данные в памяти.' } } },
} satisfies Meta<typeof ExercisesFlow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {};
export const Detail: Story = { args: { initialScreen: 'detail', initialSelected: 'squat' } };
export const Edit: Story = { args: { initialScreen: 'edit', initialSelected: 'squat' } };
export const Create: Story = { args: { initialScreen: 'create' } };
export const History: Story = { args: { initialScreen: 'history', initialSelected: 'squat' } };

export const FullJourney: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // список → карточка → история и обратно
    await userEvent.click(c.getByRole('button', { name: /Подтягивания/ }));
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Подтягивания');
    await userEvent.click(c.getByRole('button', { name: 'Все тренировки' }));
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Все тренировки');
    await userEvent.click(c.getByRole('button', { name: 'Упражнение' }));
    // редактирование: переименовать и сохранить
    await userEvent.click(c.getByRole('button', { name: 'Редактировать' }));
    const name = c.getByLabelText('Название');
    await userEvent.clear(name);
    await userEvent.type(name, 'Подтягивания широким хватом');
    await userEvent.click(c.getAllByRole('button', { name: 'Сохранить' })[0]);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Подтягивания широким хватом');
    // новое упражнение попадает в список и открывается
    await userEvent.click(c.getByRole('button', { name: 'Упражнения' }));
    await userEvent.click(c.getByRole('button', { name: 'Своё упражнение' }));
    await userEvent.type(c.getByLabelText('Название'), 'Скручивания на пресс');
    await userEvent.click(c.getByRole('button', { name: 'Пресс' }));
    await userEvent.click(c.getAllByRole('button', { name: 'Создать' })[0]);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Скручивания на пресс');
    await expect(c.getByText('Ещё не выполнялось')).toBeVisible();
  },
};

export const ReadOnly: Story = {
  args: { canManage: false },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole('button', { name: 'Своё упражнение' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: /Подтягивания/ }));
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Подтягивания');
    await expect(c.queryByRole('button', { name: 'Редактировать' })).toBeNull();
  },
};

export const CreateFails: Story = {
  args: { initialScreen: 'create', onCreate: fn(async () => { throw new Error('Упражнение с таким названием уже есть'); }) },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Название'), 'Мост');
    await userEvent.click(c.getAllByRole('button', { name: 'Создать' })[0]);
    await expect(await c.findByRole('alert')).toHaveTextContent('Упражнение с таким названием уже есть');
    await expect(args.onCreate).toHaveBeenCalledTimes(1);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Новое упражнение');
  },
};

export const SaveAndDelete: Story = {
  args: {
    initialScreen: 'edit',
    initialSelected: 'squat',
    onUpdate: fn(async (ex, draft) => ({ ...ex, name: draft.name })),
    onDelete: fn(async () => {}),
  },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const name = c.getByLabelText('Название');
    await userEvent.clear(name);
    await userEvent.type(name, 'Присед');
    await userEvent.click(c.getAllByRole('button', { name: 'Сохранить' })[0]);
    await expect(await c.findByRole('heading', { level: 1 })).toHaveTextContent('Присед');
    await userEvent.click(c.getByRole('button', { name: 'Редактировать' }));
    await userEvent.click(c.getByRole('button', { name: 'Удалить упражнение' }));
    const dialog = await within(document.body).findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledWith('squat'));
    await expect(await c.findByRole('heading', { level: 1 })).toHaveTextContent('Упражнения');
    await expect(c.queryByText('Присед')).toBeNull();
  },
};
