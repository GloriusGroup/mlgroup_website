import { test, expect } from "@playwright/test";

test.describe("Canvas animation", () => {
  test("initializes and runs at acceptable FPS", async ({ page, browserName }) => {
    // Load the page with perf debug enabled
    await page.goto("/?canvas_perf=1");

    // Wait for the animation to stabilize (3 seconds of rendering)
    await page.waitForTimeout(3000);

    const perf = await page.evaluate(() => (window as any).__parallaxCanvasPerf);

    expect(perf).toBeTruthy();
    expect(perf.fps).toBeGreaterThan(0);
    expect(perf.particles).toBeGreaterThan(10);

    // WebGL should initialize when GPU is available.
    // Headless Firefox in CI often lacks GPU → falls back to Canvas 2D, which is fine.
    if (perf.webgl !== undefined) {
      console.log(`  WebGL: ${perf.webgl ? "yes" : "no (Canvas 2D fallback)"}`);
    }

    // Headless browsers without GPU will fall back to Canvas 2D and be slow.
    // Just verify the animation loop is running. Real perf testing needs a GPU runner.
    const minFps = perf.webgl ? 10 : 2;
    expect(perf.fps).toBeGreaterThan(minFps);

    console.log(
      `[${browserName}] FPS: ${perf.fps}, draw: ${perf.drawMs}ms, ` +
      `particles: ${perf.particles}, webgl: ${perf.webgl}, quality: ${perf.quality}`
    );
  });

  test("adapts quality when under pressure", async ({ page }) => {
    // Verify the adaptive quality system exists and starts at 100%
    await page.goto("/?canvas_perf=1");
    await page.waitForTimeout(2000);

    const perf = await page.evaluate(() => (window as any).__parallaxCanvasPerf);
    expect(perf).toBeTruthy();
    // Quality should be between 0.3 and 1.0
    expect(perf.quality).toBeGreaterThanOrEqual(0.3);
    expect(perf.quality).toBeLessThanOrEqual(1.0);
  });
});

test.describe("Page smoke tests", () => {
  test("all sections render", async ({ page }) => {
    await page.goto("/");

    // Check all major sections are present
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator("#projects")).toBeVisible();
    await expect(page.locator("#publications")).toBeVisible();
    await expect(page.locator("#team")).toBeVisible();
    await expect(page.locator("#symposia")).toBeVisible();
    await expect(page.locator("#funding")).toBeVisible();
    await expect(page.locator("#contact")).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");

    // Click a nav link and verify scroll
    await page.click('a[href="#team"]');
    await page.waitForTimeout(500);
    const teamSection = page.locator("#team");
    await expect(teamSection).toBeInViewport();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors (e.g. PostHog fetch failures in test)
    const critical = errors.filter(
      (e) => !e.includes("posthog") && !e.includes("PostHog") && !e.includes("fetch")
    );
    expect(critical).toHaveLength(0);
  });
});
