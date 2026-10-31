import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../../../../ui/storyKit';
import { SpeechBubble } from './SpeechBubble';

const meta = {
  title: 'Features/Workout/SpeechBubble',
  component: SpeechBubble,
  args: { eyebrow: 'Подход 1 из 9', line: 'Обратные отжимания · 18–20 повт' },
  parameters: {
    docs: { description: { component: `Облачко чибика: надстрочник и одна строка данных. Артборд «Экран тренировки». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof SpeechBubble>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Подход 1 из 9')).toBeVisible();
    await expect(c.getByText('Обратные отжимания · 18–20 повт')).toBeVisible();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="повторы">
        <SpeechBubble eyebrow="Подход 1 из 9" line="Обратные отжимания · 18–20 повт" />
      </Row>
      <Row label="повторы + вес">
        <SpeechBubble eyebrow="Подход 1 из 3" line="Приседания · 12 кг × 12" />
      </Row>
      <Row label="время">
        <SpeechBubble eyebrow="Подход 1 из 2" line="Планка · 00:45–01:00" />
      </Row>
      <Row label="разминка">
        <SpeechBubble eyebrow="Упражнение 2 из 6" line="Вращения плечами · 00:30" />
      </Row>
      <Row label="длинное название">
        <SpeechBubble eyebrow="Подход 4 из 9" line="Обратные отжимания от лавочки · 18–20 повт" />
      </Row>
    </Stack>
  ),
};
