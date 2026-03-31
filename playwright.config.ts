import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: isCI ? 2 : 0,
  use: {
    baseURL: isCI ? "http://localhost:3000" : "http://localhost:3000",
  },
  webServer: {
    // In CI: serve the pre-built dist/ folder. Locally: use the dev server.
    command: isCI
      ? "bun -e \"Bun.serve({ port: 3000, static: { '/': new Response(Bun.file('dist/index.html'), { headers: { 'content-type': 'text/html' } }) }, fetch(req) { const path = new URL(req.url).pathname; const file = Bun.file('dist' + path); return new Response(file); } })\""
      : "bun run dev",
    port: 3000,
    reuseExistingServer: !isCI,
    timeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: {
          firefoxUserPrefs: {
            // Force-enable WebGL even in headless mode (software fallback)
            "webgl.force-enabled": true,
            "webgl.disabled": false,
            "layers.acceleration.force-enabled": true,
          },
        },
      },
    },
  ],
});
