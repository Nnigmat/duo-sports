import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        // Чистая логика (сценарий тренировки и т. п.)
        test: {
          name: 'unit',
          include: ['{shared,server,web/src}/**/*.test.ts'],
          passWithNoTests: true,
        },
      },
      {
        // Истории как тесты: play-функции и проверки a11y в headless Chromium
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          retry: process.env.CI ? 1 : 0,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
