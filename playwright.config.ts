import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/*
 * The E2E lane runs its own dev server on its own port (see `webServer` below), so it
 * never collides with the `bun start` you have open on 8787. Tests address it through
 * `baseURL` — never hard-code a port in a test.
 */
const E2E_PORT = Number(process.env.E2E_PORT ?? 8799)
const E2E_BASE_URL = `https://localhost:${E2E_PORT}`

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

  /* use .pw.ts for playwright (vs. bun) tests */
  testMatch: /.*\.pw\.ts/,

  use: {
    /* Tests goto('/slug/') — the port lives here and nowhere else. */
    baseURL: E2E_BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* allow https on localhost with self-signed certificate */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
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

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /*
   * Start a dedicated dev server for the E2E lane. Without this, the lane only ran when
   * a human happened to have `bun start` up — which is how it rotted red for ~a month
   * across ~20 tagged releases (stale selectors, not regressions; nobody was looking).
   *
   * It gets its OWN port and `HALTIJA_DEV: '0'`, and never reuses an existing server:
   *
   * - `HALTIJA_DEV: '0'` — the site config sets `haltijaDev: true`, which injects the
   *   haltija dev overlay into every served page. Locally that made the E2E lane assert
   *   against a DOM that CI (where the overlay is off) never sees, and tests had already
   *   started contorting around the overlay's controls.
   * - own port + `reuseExistingServer: false` — otherwise Playwright either ADOPTS your
   *   running `bun start` (overlay and all, defeating the env override) or, because
   *   `devServer` kills whatever holds its port, KILLS it out from under you.
   *
   * The pages this lane loads also registered as haltija windows, and `bin/dev.ts --test`
   * reuses any haltija with windows open — so a Playwright run left `bun run test-browser`
   * timing out. Turning the overlay off here fixes that too.
   */
  webServer: {
    command: 'bun start',
    env: { HALTIJA_DEV: '0', PORT: String(E2E_PORT) },
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
