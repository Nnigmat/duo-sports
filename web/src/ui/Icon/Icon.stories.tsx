import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT, Row, Stack } from '../storyKit';
import { Icon } from './Icon';
import { icons, type IconName } from './icons';

const names = Object.keys(icons) as IconName[];

const meta = {
  title: 'UI/Icon',
  component: Icon,
  args: { name: 'check', size: 24 },
  argTypes: { name: { control: 'select', options: names }, size: { control: 'inline-radio', options: [20, 24] } },
  parameters: { docs: { description: { component: `Артборд «Экран тренировки» (иконки кнопок). Размеры 20 и 24 вместо 18 и 22 из макета. ${ARTIFACT}` } } },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Size20: Story = { args: { size: 20 } };

export const AllVariants: Story = {
  render: () => (
    <Stack>
      {([24, 20] as const).map((s) => (
        <Row key={s} label={`${s} px`}>
          {names.map((n) => (
            <span key={n} title={n} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72 }}>
              <Icon name={n} size={s} />
              <span style={{ fontSize: 'var(--caption-size)', color: 'var(--steel)' }}>{n}</span>
            </span>
          ))}
        </Row>
      ))}
    </Stack>
  ),
};
