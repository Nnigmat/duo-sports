import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../../../ui/storyKit';
import { FeedbackScreen } from './FeedbackScreen';

const onSend = fn();
const onBack = fn();

type Props = React.ComponentProps<typeof FeedbackScreen>;

/** Обёртка с состоянием: оценка и комментарий меняются, как в приложении */
function Stateful(props: Props) {
  const [feeling, setFeeling] = useState(props.feeling);
  const [comment, setComment] = useState(props.comment);
  return <FeedbackScreen {...props} feeling={feeling} comment={comment} onRate={setFeeling} onComment={setComment} />;
}

const meta = {
  title: 'Features/Workout/FeedbackScreen',
  component: FeedbackScreen,
  args: { feeling: null, comment: '', onRate: fn(), onComment: fn(), onSend, onBack },
  render: (args) => <Stateful {...args} />,
  beforeEach: () => {
    onSend.mockReset();
    onBack.mockReset();
  },
  parameters: {
    layout: 'fullscreen',
    bleed: true,
    docs: {
      description: {
        component: `Экран «Обратная связь»: оценка самочувствия 1–5 (обязательна), чибик меняет эмоцию, необязательный комментарий. Без оценки «Отправить тренеру» неактивна, «Пропустить» нет. ${ARTIFACT}`,
      },
    },
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof FeedbackScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Обратная связь' })).toBeVisible();
    // Без оценки кнопка неактивна и просит выбрать
    const send = c.getByRole('button', { name: 'Выберите самочувствие' });
    await expect(send).toBeDisabled();
    await userEvent.click(send);
    await expect(onSend).not.toHaveBeenCalled();
    // Пропустить нельзя: такой кнопки нет
    await expect(c.queryByRole('button', { name: /Пропустить/ })).toBeNull();

    await userEvent.click(c.getByRole('button', { name: 'Хорошо' }));
    await expect(c.getByRole('button', { name: 'Хорошо' })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByText('приятная усталость', { exact: false })).toBeVisible();
    await userEvent.type(c.getByLabelText('Комментарий к тренировке'), 'колено');
    await userEvent.click(c.getByRole('button', { name: 'Отправить тренеру' }));
    await expect(onSend).toHaveBeenCalledTimes(1);

    await userEvent.click(c.getByRole('button', { name: 'К итогам' }));
    await expect(onBack).toHaveBeenCalledTimes(1);
  },
};

/** Персонаж меняет эмоцию под оценку */
export const CharacterFollowsRating: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Плохо' }));
    await expect(c.getByRole('img', { name: /сидит и пьёт воду/ })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Отлично' }));
    await expect(c.getByRole('img', { name: /большой палец/ })).toBeVisible();
  },
};

export const Sending: Story = { args: { feeling: 5, sending: true } };

export const WithError: Story = {
  args: { feeling: 3, comment: 'тяжело дались выпады', error: 'Нет связи с сервером: итоги не сохранены, нажмите «Отправить тренеру» ещё раз' },
};
