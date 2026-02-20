import { serve } from "bun";
import design5 from "./design5/index.html";

const server = serve({
  routes: {
    "/": design5,
    "/api/posthog-config": () =>
      Response.json({
        key: Bun.env.VITE_PUBLIC_POSTHOG_KEY ?? "",
        host: Bun.env.VITE_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
        enabled: Bun.env.VITE_PUBLIC_POSTHOG_ENABLED !== "false",
      }),
    "/api/dev-config": () =>
      Response.json({
        themeSwitch: Bun.env.DEV_THEME_SWITCH === "true",
      }),
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

