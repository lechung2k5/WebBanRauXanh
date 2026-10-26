import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://localhost:13000', trace: 'retain-on-failure', ...devices['Desktop Chrome'], channel: 'chrome' },
  webServer: {
    command: 'npm run start -- -p 13000',
    url: 'http://localhost:13000/dang-nhap',
    reuseExistingServer: false,
    env: { BACKEND_API_URL: 'http://localhost:18080/api/v1', APP_ORIGIN: 'http://localhost:13000' },
  },
});
