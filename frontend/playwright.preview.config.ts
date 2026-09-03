import { defineConfig, devices } from '@playwright/test'

// A built frontend with no FastAPI process/proxy. The live-API suite stays independent.
export default defineConfig({
  testDir: './e2e-preview',
  outputDir: './test-results/preview',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
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
  webServer: {
    command: 'node e2e-preview/serve.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
