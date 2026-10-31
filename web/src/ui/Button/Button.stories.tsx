import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../storyKit';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Начать', variant: 'primary', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    icon: { control: 'select', options: [undefined, 'play', 'plus', 'check'] },
    compact: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  parameters: {
    docs: { description: { component: `Артборды «Старт тренировки», «Изменить подход» (primary, ghost «Добавить вес»), «Все комментарии тренера» (secondary), «Тренировка завершена». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithIcon: Story = { args: { icon: 'play', children: 'Начать тренировку' } };
export const Compact: Story = { args: { compact: true, children: 'Сохранить' } };
export const Secondary: Story = { args: { variant: 'secondary', compact: true, children: 'Показать более ранние' } };
export const Ghost: Story = { args: { variant: 'ghost', compact: true, icon: 'plus', children: 'Добавить вес' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Удалить' } };

export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button')).toHaveFocus();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.click(button);
    await expect(button).toBeDisabled();
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Loading: Story = {
  args: { loading: true, children: 'Сохраняем' },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Clickable: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const AsLink: Story = {
  args: { href: '#next', children: 'Далее' },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Далее' });
    await expect(link.tagName).toBe('A');
    await expect(link).toHaveAttribute('href', '#next');
  },
};

export const AsLinkDisabled: Story = {
  args: { href: '#next', children: 'Далее', disabled: true },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Далее' });
    await expect(link).toHaveAttribute('aria-disabled', 'true');
    await expect(link).not.toHaveAttribute('href');
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
        <Row key={variant} label={variant}>
          <Button variant={variant}>Обычная</Button>
          <Button variant={variant} compact icon="plus">С иконкой</Button>
          <Button variant={variant} disabled>Disabled</Button>
          <Button variant={variant} loading>Loading</Button>
        </Row>
      ))}
    </Stack>
  ),
};
