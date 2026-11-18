import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { NoteStage } from './NoteStage';

const onDone = fn();
const onBack = fn();
const onSkip = fn();
const onExit = fn();
const onAnswer = fn();

/** Ответ хранит экран выше (сессия); в истории его держит состояние */
function Stateful(props: React.ComponentProps<typeof NoteStage>) {
  const [answer, setAnswer] = useState(props.answer);
  return (
    <NoteStage
      {...props}
      answer={answer}
      onAnswer={(text) => {
        setAnswer(text);
        props.onAnswer(text);
      }}
    />
  );
}

const meta = {
  title: 'Features/Workout/NoteStage',
  component: NoteStage,
  render: (args) => <Stateful {...args} />,
  args: {
    title: 'Тест большого пальца',
    text: 'Согни большой палец к ладони и разогни. Есть ли боль в основании?',
    answer: '',
    onAnswer,
    onDone,
    onBack,
    onSkip,
    onExit,
  },
  beforeEach: () => {
    for (const f of [onDone, onBack, onSkip, onExit, onAnswer]) f.mockReset();
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Шаг-заметка: текст тренера, необязательное поле «Ответ», «Назад», «Готово», «Пропустить».' } } },
} satisfies Meta<typeof NoteStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutAnswer: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Тест большого пальца' })).toBeVisible();
    await expect(c.getByLabelText(/Ответ/)).toHaveValue('');
    // Ответ не обязателен: «Готово» работает с пустым полем
    await userEvent.click(c.getByRole('button', { name: 'Готово' }));
    await expect(onDone).toHaveBeenCalledTimes(1);
    await userEvent.click(c.getByRole('button', { name: 'Назад' }));
    await expect(onBack).toHaveBeenCalledTimes(1);
    await userEvent.click(c.getByRole('button', { name: 'Пропустить' }));
    await expect(onSkip).toHaveBeenCalledTimes(1);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

export const WithAnswer: Story = {
  args: { answer: 'Боли нет, сгибается до конца.' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const field = c.getByLabelText(/Ответ/);
    await expect(field).toHaveValue('Боли нет, сгибается до конца.');
    await userEvent.type(field, ' Утром было иначе.');
    await expect(onAnswer).toHaveBeenLastCalledWith('Боли нет, сгибается до конца. Утром было иначе.');
    await userEvent.click(c.getByRole('button', { name: 'Готово' }));
    await expect(onDone).toHaveBeenCalledTimes(1);
  },
};

export const FirstStep: Story = {
  args: { onBack: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Назад' })).toBeNull();
  },
};

export const Touch44: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const el of [...c.getAllByRole('button'), ...c.getAllByRole('textbox')]) {
      await expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};
