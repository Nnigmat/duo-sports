import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { ARTIFACT } from '../../../ui/storyKit';
import { mockCamera } from './mockCamera';
import { RecordingScreen } from './RecordingScreen';

const onUpload = fn();
const onCancel = fn();

const meta = {
  title: 'Features/Workout/RecordingScreen',
  component: RecordingScreen,
  args: {
    eyebrow: 'Круг 2 · подход 4 из 9',
    line: 'Обратные отжимания · 18–20 повт',
    onUpload,
    onCancel,
  },
  beforeEach: () => {
    onUpload.mockReset().mockResolvedValue(undefined);
    onCancel.mockReset();
  },
  parameters: {
    layout: 'fullscreen',
    bleed: true,
    docs: {
      description: {
        component: `Экран записи подхода. Камера показывает превью сразу, запись начинается по «Начать запись» после отсчёта 5 с со звуком (время поставить телефон и занять позу); запись стартует после длинного сигнала. Во время записи красная рамка и «Идёт запись», кнопка «Остановить». После остановки просмотр со звуком по тапу на кадр и две кнопки: «Сбросить» (с подтверждением «Удалить видео?») и «Отправить». История **Live** работает с настоящей камерой, остальные подменяют её, чтобы показать состояния и прогнать тесты без камеры. Камера требует https или localhost. Артборд «Идёт запись подхода». ${ARTIFACT}`,
      },
    },
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof RecordingScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Настоящая камера: браузер спросит разрешение. Не участвует в vitest, там камеры нет. */
export const Live: Story = {
  tags: ['!test', '!autodocs'],
};

/** Камера подменена анимированной картинкой: превью настоящее, запись не идёт, пока не нажат «Начать запись» */
export const Ready: Story = {
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByRole('button', { name: 'Начать запись' })).toBeEnabled(), { timeout: 5000 });
    await expect(c.getByText(/Запись начнётся через 5 с/)).toBeVisible();
    await expect(c.getByRole('button', { name: 'Сменить камеру' })).toBeVisible();
  },
};

/** Микрофон не разрешён: запись доступна, но экран честно говорит, что звука не будет */
export const NoMicrophone: Story = {
  beforeEach: () => mockCamera('no-mic'),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByRole('button', { name: 'Начать запись' })).toBeEnabled(), { timeout: 5000 });
    await expect(c.getByRole('status')).toHaveTextContent('Нет доступа к микрофону, видео будет без звука');
  },
};

/** Смена камеры: пока новая не открылась, предупреждение о прошлой камере не показываем */
export const NoMicrophoneClearsOnSwitch: Story = {
  beforeEach: () => mockCamera('no-mic-then-pending'),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByRole('status')).toHaveTextContent('Нет доступа к микрофону'), { timeout: 5000 });
    await userEvent.click(c.getByRole('button', { name: 'Сменить камеру' }));
    await waitFor(() => expect(c.queryByText(/Нет доступа к микрофону/)).toBeNull());
  },
};

/** После «Начать запись» идёт отсчёт 5 с, затем запись */
export const Countdown: Story = {
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByRole('button', { name: 'Начать запись' })).toBeEnabled(), { timeout: 5000 });
    await userEvent.click(c.getByRole('button', { name: 'Начать запись' }));
    await expect(c.getByRole('status', { name: /Запись начнётся через \d с/ })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Отмена' })).toBeVisible();
  },
};

export const Starting: Story = {
  beforeEach: () => mockCamera('pending'),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Включаем камеру')).toBeVisible();
    await expect(within(canvasElement).getByRole('button', { name: 'Начать запись' })).toBeDisabled();
  },
};

export const Denied: Story = {
  beforeEach: () => mockCamera('NotAllowedError'),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText('Нет доступа к камере')).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Начать запись' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Назад' }));
    await expect(onCancel).toHaveBeenCalledTimes(1);
  },
};

export const CameraError: Story = {
  beforeEach: () => mockCamera('NotFoundError'),
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Камера не запустилась')).toBeVisible();
  },
};

export const Unsupported: Story = {
  beforeEach: () => mockCamera('no-api'),
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Запись недоступна')).toBeVisible();
  },
};

// Ниже проверки поведения: они меняют экран (запускают и останавливают запись), поэтому скрыты из интерфейса, но идут в vitest.
const hidden = ['!dev', '!autodocs'];

const stopButton = (c: ReturnType<typeof within>) => c.queryByRole('button', { name: 'Остановить' });

async function whenReady(canvasElement: HTMLElement) {
  const c = within(canvasElement);
  await waitFor(() => expect(c.getByRole('button', { name: 'Начать запись' })).toBeEnabled(), { timeout: 5000 });
  return c;
}

/** «Старт» и ожидание первого куска записи (MediaRecorder отдаёт данные раз в секунду) */
async function startAndRecord(canvasElement: HTMLElement) {
  const c = await whenReady(canvasElement);
  await userEvent.click(c.getByRole('button', { name: 'Начать запись' }));
  await waitFor(() => expect(stopButton(c)).not.toBeNull(), { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 1300));
  return c;
}

export const NoAutoStart: Story = {
  tags: hidden,
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await whenReady(canvasElement);
    await new Promise((r) => setTimeout(r, 1500));
    // Прошло время, а запись не началась: ни «Стоп», ни REC
    await expect(stopButton(c)).toBeNull();
    await expect(c.getByRole('button', { name: 'Начать запись' })).toBeEnabled();
  },
};

export const StartWaitsForCountdown: Story = {
  tags: hidden,
  args: { startDelaySec: 2 },
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await whenReady(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Начать запись' }));
    // Сразу после нажатия идёт отсчёт, записи ещё нет
    await expect(c.getByRole('status', { name: /Запись начнётся через \d с/ })).toBeVisible();
    await expect(stopButton(c)).toBeNull();
    // Через ~2 с отсчёт заканчивается и запись начинается сама
    await waitFor(() => expect(stopButton(c)).not.toBeNull(), { timeout: 4000 });
    await expect(c.getByRole('status')).toHaveTextContent('Идёт запись');
  },
};

export const NoDelayStartsAtOnce: Story = {
  tags: hidden,
  args: { startDelaySec: 0 },
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await whenReady(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Начать запись' }));
    await waitFor(() => expect(stopButton(c)).not.toBeNull());
  },
};

export const CancelCountdown: Story = {
  tags: hidden,
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await whenReady(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Начать запись' }));
    await userEvent.click(c.getByRole('button', { name: 'Отмена' }));
    // Назад к превью: камера включена, можно стартовать заново, выхода с экрана не было
    await expect(c.getByRole('button', { name: 'Начать запись' })).toBeEnabled();
    await expect(stopButton(c)).toBeNull();
    await expect(onCancel).not.toHaveBeenCalled();
  },
};

async function stopRecording(c: ReturnType<typeof within>) {
  await userEvent.click(c.getByRole('button', { name: 'Остановить' }));
  await c.findByRole('button', { name: 'Смотреть запись' });
}

export const SendUploadsVideo: Story = {
  tags: hidden,
  args: { startDelaySec: 0 },
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await startAndRecord(canvasElement);
    await stopRecording(c);
    // Остановка ничего не загружает
    await expect(onUpload).not.toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Отправить' }));
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const blob = onUpload.mock.calls[0][0] as Blob;
    await expect(blob.size).toBeGreaterThan(0);
    await expect(blob.type).toMatch(/^video\//);
    await expect(onCancel).not.toHaveBeenCalled();
  },
};

export const Recording: Story = {
  tags: hidden,
  args: { startDelaySec: 0 },
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await startAndRecord(canvasElement);
    await expect(c.getByRole('status')).toHaveTextContent('Идёт запись');
    await expect(canvasElement.querySelector('[data-state="recording"]')).not.toBeNull();
    // Таймера записи нет
    await expect(c.queryByRole('timer')).toBeNull();
  },
};

export const Stopped: Story = {
  tags: hidden,
  args: { startDelaySec: 0 },
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await startAndRecord(canvasElement);
    await stopRecording(c);
    await expect(c.getByRole('button', { name: 'Сбросить' })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Отправить' })).toBeVisible();
    // Отдельной кнопки «Просмотр» нет: смотрим по тапу на кадр, звук включён
    await expect(c.queryByRole('button', { name: 'Просмотр' })).toBeNull();
    const video = canvasElement.querySelector('video[src]') as HTMLVideoElement;
    await expect(video.muted).toBe(false);
  },
};

export const KeepAfterDiscardPrompt: Story = {
  tags: hidden,
  args: { startDelaySec: 0 },
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await startAndRecord(canvasElement);
    await stopRecording(c);
    await userEvent.click(c.getByRole('button', { name: 'Сбросить' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Удалить видео?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Оставить' }));
    // Видео не потеряно без подтверждения
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(c.getByRole('button', { name: 'Отправить' })).toBeEnabled();
    await expect(onCancel).not.toHaveBeenCalled();
  },
};

export const DiscardConfirmed: Story = {
  tags: hidden,
  args: { startDelaySec: 0 },
  beforeEach: () => mockCamera('stream'),
  play: async ({ canvasElement }) => {
    const c = await startAndRecord(canvasElement);
    await stopRecording(c);
    await userEvent.click(c.getByRole('button', { name: 'Сбросить' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Удалить видео?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Удалить' }));
    await expect(onCancel).toHaveBeenCalledTimes(1);
    // На сервер ничего не уходит
    await expect(onUpload).not.toHaveBeenCalled();
  },
};

export const UploadErrorCanRetry: Story = {
  tags: hidden,
  args: { startDelaySec: 0 },
  beforeEach: () => {
    const restore = mockCamera('stream');
    onUpload.mockReset().mockRejectedValueOnce(new Error('Нет сети')).mockResolvedValue(undefined);
    return restore;
  },
  play: async ({ canvasElement }) => {
    const c = await startAndRecord(canvasElement);
    await stopRecording(c);
    await userEvent.click(c.getByRole('button', { name: 'Отправить' }));
    await expect(await c.findByRole('alert')).toHaveTextContent('Нет сети');
    // Повтор отправляет тот же файл, камера заново не включается
    await userEvent.click(c.getByRole('button', { name: 'Отправить' }));
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));
    await expect(onUpload.mock.calls[1][0]).toBe(onUpload.mock.calls[0][0]);
  },
};
