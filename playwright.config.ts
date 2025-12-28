import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Timeout para cada teste */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },

  /* Executar testes em paralelo */
  fullyParallel: true,

  /* Falhar o build se houver testes com falha */
  forbidOnly: !!process.env.CI,

  /* Retry em CI */
  retries: process.env.CI ? 2 : 0,

  /* Workers em CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : ['list']
  ],

  /* Configurações compartilhadas */
  use: {
    /* Base URL */
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',

    /* Coletar trace quando retentar */
    trace: 'on-first-retry',

    /* Screenshots */
    screenshot: 'only-on-failure',

    /* Vídeo */
    video: 'retain-on-failure',

    /* Action timeout */
    actionTimeout: 10000,
  },

  /* Configurar servidores de desenvolvimento */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: './frontend'
    },
    {
      command: 'npm start',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: './backend-core',
      env: {
        NODE_ENV: 'test',
        MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-academy-test'
      }
    }
  ],

  /* Configurar projetos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Testes mobile */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
