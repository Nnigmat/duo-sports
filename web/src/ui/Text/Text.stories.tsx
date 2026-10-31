import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT, Stack } from '../storyKit';
import { Text } from './Text';

const meta = {
  title: 'UI/Text',
  component: Text,
  args: { children: 'Каждый подход на счету', variant: 'body' },
  argTypes: {
    variant: { control: 'select', options: ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'body', 'body-sm', 'caption', 'eyebrow'] },
    color: { control: 'inline-radio', options: [undefined, 'ink', 'slate', 'steel'] },
    tag: { control: 'text' },
  },
  parameters: {
    docs: { description: { component: `Артборды «Старт тренировки» (h1, eyebrow) и «Комментарии тренера» (заголовок, подписи). ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Eyebrow: Story = { args: { variant: 'eyebrow', children: 'Группы мышц' } };
export const Slate: Story = { args: { color: 'slate', variant: 'body-sm', children: 'Последний раз: 60 кг × 10' } };
export const Steel: Story = { args: { color: 'steel', variant: 'caption', children: 'Отдых 90 с между подходами' } };

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Text variant="display">Display</Text>
      <Text variant="h1">Заголовок h1</Text>
      <Text variant="h2">Заголовок h2</Text>
      <Text variant="h3">Заголовок h3</Text>
      <Text variant="h4">Заголовок h4</Text>
      <Text variant="h5">Заголовок h5</Text>
      <Text variant="body">Основной текст 16 px</Text>
      <Text variant="body-sm" color="slate">Вторичный текст 14 px</Text>
      <Text variant="caption">Подсказка 13 px</Text>
      <Text variant="eyebrow">Надстрочник</Text>
    </Stack>
  ),
};
