// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for the VALOBOIS web app.
 *
 * The app is a set of static files served over HTTP (file:// is explicitly
 * unsupported, see README). We boot a plain Python HTTP server on a dedicated
 * port so the suite never collides with a dev server a contributor may already
 * be running on 8080.
 */
const PORT = 8077;
const BASE_URL = `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  // Each spec gets an isolated browser context, so localStorage / sessionStorage
  // (where the app persists the current evaluation and active editor tab) start
  // empty for every test — keeping them deterministic.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: `${BASE_URL}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
