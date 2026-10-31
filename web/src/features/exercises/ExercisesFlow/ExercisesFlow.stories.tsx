import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ExercisesFlow } from './ExercisesFlow';

const meta = {
  title: 'Features/Exercises/ExercisesFlow',
  component: ExercisesFlow,
  parameters: { bleed: true, docs: { description: { component: 'Все мобильные экраны вкладки «Упражнения» в одном сценарии, данные в памяти.' } } },
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
    await userEvent.click(c.getByRole('button', { name: 'Сохранить' }));
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Подтягивания широким хватом');
    // новое упражнение попадает в список и открывается
    await userEvent.click(c.getByRole('button', { name: 'Упражнения' }));
    await userEvent.click(c.getByRole('button', { name: 'Своё упражнение' }));
    await userEvent.type(c.getByLabelText('Название'), 'Скручивания на пресс');
    await userEvent.click(c.getByRole('button', { name: 'Пресс' }));
    await userEvent.click(c.getByRole('button', { name: 'Создать' }));
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Скручивания на пресс');
    await expect(c.getByText('Ещё не выполнялось')).toBeVisible();
  },
};
