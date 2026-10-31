import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../../../../ui/storyKit';
import { CoachNote } from './CoachNote';

const meta = {
  title: 'Features/Workout/CoachNote',
  component: CoachNote,
  args: { text: 'Локти назад, не разводи в стороны. Спину держи ближе к лавочке.', onOpen: fn() },
  decorators: [(Story) => <div style={{ width: 358 }}><Story /></div>],
  parameters: {
    docs: { description: { component: `Карточка под чибиком с последним комментарием тренера, до 3 строк; нажатие открывает все комментарии. Артборд «Экран тренировки». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof CoachNote>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /комментарий тренера/i }));
    await expect(args.onOpen).toHaveBeenCalledTimes(1);
  },
};

export const LongText: Story = {
  args: {
    text: 'Локти назад, не разводи в стороны. Спину держи ближе к лавочке, опускайся до прямого угла в локтях и не бросай корпус вниз. Дыши ровно: вдох на спуске, выдох на подъёме. Если тяжело, сократи амплитуду, но не теряй форму.',
  },
  play: async ({ canvasElement }) => {
    const text = canvasElement.querySelector('span:not([class*="srOnly"]):not([class*="chevron"])') as HTMLElement;
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
    await expect(text.getBoundingClientRect().height).toBeLessThanOrEqual(lineHeight * 3 + 1);
  },
};

export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button')).toHaveFocus();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="одна строка">
        <CoachNote text="Хорошая техника" onOpen={() => {}} />
      </Row>
      <Row label="три строки с обрезкой">
        <CoachNote
          text="Локти назад, не разводи в стороны. Спину держи ближе к лавочке, опускайся до прямого угла в локтях. Дыши ровно: вдох на спуске, выдох на подъёме."
          onOpen={() => {}}
        />
      </Row>
    </Stack>
  ),
};
