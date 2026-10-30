import { defineConfig, devices } from '@playwright/test';
const port = process.env.E2E_PORT || '4173';
export default defineConfig({
  testDir: './tests/e2e', timeout: 45000, forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { headless: !process.env.E2E_HEADED, launchOptions: { slowMo: Number(process.env.E2E_SLOW_MO || 0) }, baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: process.env.E2E_RECORD ? 'on' : 'retain-on-failure', acceptDownloads: true, serviceWorkers: 'block' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-smoke', grep: /@smoke/, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: { command: `python3 -m http.server ${port} --bind 127.0.0.1`, url: `http://127.0.0.1:${port}/`, reuseExistingServer: false },
});
