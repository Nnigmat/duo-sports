import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, within } from 'storybook/test';
import type { Technique } from '../../../../../../shared/types';
import { Button } from '../../../../ui/Button/Button';
import { ARTIFACT } from '../../../../ui/storyKit';
import { COMMENTS, NOW, TECHNIQUE } from '../storyData';
import { TechSheet } from './TechSheet';

const onOpenComments = fn();

function Demo({ withComment = true, technique = TECHNIQUE }: { withComment?: boolean; technique?: Technique }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" compact onClick={() => setOpen(true)}>
        Открыть панель
      </Button>
      <TechSheet
        open={open}
        onOpenChange={setOpen}
        title="Обратные отжимания от лавочки"
        pose="dips"
        technique={technique}
        comment={withComment ? COMMENTS[0] : undefined}
        commentsCount={5}
        onOpenComments={onOpenComments}
        now={NOW}
      />
    </>
  );
}

const meta = {
  title: 'Features/Workout/TechSheet',
  component: TechSheet,
  parameters: {
    docs: {
      description: {
        component: `Высокая панель «Техника»: замедленная анимация, последний комментарий тренера, шаги и частая ошибка. Анимация замедлена до 0,5× и управляется кнопками «Повторить» и «Пауза». Артборд «Техника — анимация, инструкция, комментарий». ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof TechSheet>;
export default meta;
type Story = StoryObj;

async function open() {
  await userEvent.click(within(document.body).getByRole('button', { name: 'Открыть панель' }));
  return within(await screen.findByRole('dialog', { name: 'Обратные отжимания от лавочки' }));
}

export const Default: Story = {
  render: () => <Demo />,
  play: async () => {
    onOpenComments.mockClear();
    const dialog = await open();
    await expect(dialog.getByText('Замедленно · 0,5×')).toBeVisible();
    await expect(dialog.getByText('28 октября · к видео: Видео · круг 2, подход 4')).toBeVisible();
    await expect(dialog.getByText('Новый')).toBeVisible();
    await expect(dialog.getByText(/Частая ошибка/)).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: /Все комментарии · 5/ }));
    await expect(onOpenComments).toHaveBeenCalledTimes(1);
  },
};

export const PauseAndReplay: Story = {
  render: () => <Demo />,
  play: async () => {
    const dialog = await open();
    await userEvent.click(dialog.getByRole('button', { name: 'Пауза' }));
    await expect(dialog.getByRole('button', { name: 'Продолжить' })).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Повторить' }));
    // «Повторить» запускает анимацию заново
    await expect(dialog.getByRole('button', { name: 'Пауза' })).toBeVisible();
  },
};

export const WithoutComment: Story = {
  render: () => <Demo withComment={false} />,
  play: async () => {
    const dialog = await open();
    await expect(dialog.queryByText('Комментарий тренера')).toBeNull();
  },
};

export const Empty: Story = {
  render: () => <Demo technique={{ instructions: [] }} />,
  play: async () => {
    const dialog = await open();
    await expect(dialog.getByText('Описания пока нет')).toBeVisible();
    await expect(dialog.getByText('Тренер или админ добавят его в разделе «Упражнения»')).toBeVisible();
    await expect(dialog.queryByText('Как выполнять')).toBeNull();
  },
};
