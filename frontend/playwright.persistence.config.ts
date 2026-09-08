import { defineConfig, devices } from '@playwright/test'

const python =
  process.env.E2E_PYTHON ||
  (process.platform === 'win32'
    ? '../backend/.venv/Scripts/python.exe'
    : '../backend/.venv/bin/python')
const database = process.env.E2E_DATABASE_URL
if (!database || !new URL(database).pathname.endsWith('_e2e'))
  throw new Error('E2E_DATABASE_URL must name a dedicated *_e2e PostgreSQL database.')

export default defineConfig({
  testDir: './e2e-persistence',
  outputDir: './test-results/persistence',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    {
      command: `"${python}" ../backend/scripts/prepare_e2e.py && "${python}" -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8002`,
      url: 'http://127.0.0.1:8002/api/v1/ready',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        APP_ENV: 'test',
        DATABASE_URL: database,
        PERSISTENCE_ENABLED: 'true',
        CORS_ORIGINS: '["http://127.0.0.1:5175"]',
        SIGNUP_RATE_LIMIT: '100',
      },
    },
    {
      command: 'npm run dev -- --port 5175',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:8002' },
    },
  ],
})
