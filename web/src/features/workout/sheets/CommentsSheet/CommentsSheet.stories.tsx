import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, within } from 'storybook/test';
import type { CoachComment } from '../../../../../../shared/types';
import { Button } from '../../../../ui/Button/Button';
import { ARTIFACT } from '../../../../ui/storyKit';
import { COMMENTS, DIPS, NOW } from '../storyData';
import { CommentsSheet } from './CommentsSheet';

const onBack = fn();
const onLoadMore = fn();
const onOpenVideo = fn();

function Demo({ comments = COMMENTS, withBack, hasMore }: { comments?: CoachComment[]; withBack?: boolean; hasMore?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" compact onClick={() => setOpen(true)}>
        Открыть панель
      </Button>
      <CommentsSheet
        open={open}
        onOpenChange={setOpen}
        onBack={withBack ? onBack : undefined}
        exerciseId={DIPS.id}
        exerciseName={DIPS.name}
        comments={comments}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        onOpenVideo={onOpenVideo}
        now={NOW}
      />
    </>
  );
}

const meta = {
  title: 'Features/Workout/CommentsSheet',
  component: CommentsSheet,
  parameters: {
    docs: {
      description: {
        component: `Высокая панель «Комментарии тренера»: фильтр «упражнение / все», сначала новые, ссылки на видео, «Показать более ранние». Артборд «Все комментарии тренера». ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof CommentsSheet>;
export default meta;
type Story = StoryObj;

async function open() {
  await userEvent.click(within(document.body).getByRole('button', { name: 'Открыть панель' }));
  return within(await screen.findByRole('dialog', { name: 'Комментарии тренера' }));
}

export const ExerciseOnly: Story = {
  render: () => <Demo />,
  play: async () => {
    const dialog = await open();
    await expect(dialog.getByRole('button', { name: `${DIPS.name} · 5`, pressed: true })).toBeVisible();
    await expect(dialog.getAllByRole('listitem')).toHaveLength(5);
    // первый — новый, затем по дате от свежих
    await expect(dialog.getAllByRole('listitem')[0]).toHaveTextContent('28 октября');
    await expect(dialog.getAllByRole('listitem')[0]).toHaveTextContent('Новый');
    await expect(dialog.queryByText('Выпады')).toBeNull();
  },
};

export const AllComments: Story = {
  render: () => <Demo hasMore />,
  play: async () => {
    onLoadMore.mockClear();
    const dialog = await open();
    await userEvent.click(dialog.getByRole('button', { name: 'Все · 8' }));
    await expect(dialog.getAllByRole('listitem')).toHaveLength(8);
    // сначала новые: «Выпады» (09:00) после «Обратных отжиманий» (10:00) того же дня
    await expect(dialog.getByText('Выпады')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Показать более ранние' }));
    await expect(onLoadMore).toHaveBeenCalledTimes(1);
  },
};

export const WithBack: Story = {
  render: () => <Demo withBack />,
  play: async () => {
    onBack.mockClear();
    const dialog = await open();
    await userEvent.click(dialog.getByRole('button', { name: 'Назад' }));
    await expect(onBack).toHaveBeenCalledTimes(1);
  },
};

export const OpenVideo: Story = {
  render: () => <Demo />,
  play: async () => {
    onOpenVideo.mockClear();
    const dialog = await open();
    await userEvent.click(dialog.getAllByRole('button', { name: 'Видео · круг 2, подход 4' })[0]);
    await expect(onOpenVideo).toHaveBeenCalledWith('v1');
  },
};

export const Empty: Story = {
  render: () => <Demo comments={[]} />,
  play: async () => {
    const dialog = await open();
    await expect(dialog.getByText('Комментариев пока нет')).toBeVisible();
  },
};
