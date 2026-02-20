import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import "./styles.css";

import { MoleculeCanvas } from "./components/MoleculeCanvas";
import { ParallaxMoleculeCanvas } from "./components/ParallaxMoleculeCanvas";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Projects } from "./components/Projects";
import { Publications } from "./components/Publications";
import { Team } from "./components/Team";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { CookieBanner } from "./components/CookieBanner";
import { ACCENT_PRESETS } from "./shared/accents";

// Experimental feature flags (URL params)
const PARALLAX_MODE = true; //new URLSearchParams(window.location.search).get("parallax") === "true";

// Set after successful posthog.init()
let posthogInitialized = false;

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  const [isDark, setIsDark] = useState(true);
  const [accentIndex, setAccentIndex] = useState(
    () => {
      const stored = localStorage.getItem("accent_index");
      return stored ? Math.min(Number(stored), ACCENT_PRESETS.length - 1) : 0;
    }
  );
  const [devSwitchEnabled, setDevSwitchEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/dev-config")
      .then((res) => res.json())
      .then(({ themeSwitch }: { themeSwitch: boolean }) => {
        setDevSwitchEnabled(themeSwitch);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.add("light-mode");
    }
  }, [isDark]);

  useEffect(() => {
    const el = document.documentElement;
    // Remove all accent classes
    for (const preset of ACCENT_PRESETS) {
      if (preset.className) el.classList.remove(preset.className);
    }
    // Apply current accent class (index 0 = default, no class needed)
    const current = ACCENT_PRESETS[accentIndex];
    if (current?.className) el.classList.add(current.className);
    localStorage.setItem("accent_index", String(accentIndex));
  }, [accentIndex]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);
  const cycleAccent = useCallback(
    () => setAccentIndex((prev) => (prev + 1) % ACCENT_PRESETS.length),
    []
  );

  // useEffect(() => {
  // // Set up the interval
  // const interval = setInterval(() => {
  //   cycleAccent();
  // }, 100); // 1000ms = 1 second

  // // CLEANUP: This is crucial. It clears the timer if the 
  // // component unmounts to prevent memory leaks and crashes.
  // return () => clearInterval(interval);
  // }, [cycleAccent]);


  return (
    <>
      {PARALLAX_MODE ? (
        <ParallaxMoleculeCanvas isDark={isDark} accentRgb={isDark ? ACCENT_PRESETS[accentIndex]!.rgb : ACCENT_PRESETS[accentIndex]!.rgbLight} />
      ) : (
        <MoleculeCanvas isDark={isDark} accentRgb={isDark ? ACCENT_PRESETS[accentIndex]!.rgb : ACCENT_PRESETS[accentIndex]!.rgbLight} />
      )}
      <div className="content-layer">
        <Nav
          isDark={isDark}
          onToggle={toggleTheme}
          accentName={ACCENT_PRESETS[accentIndex]!.name}
          onCycleAccent={cycleAccent}
          devSwitchEnabled={devSwitchEnabled}
        />
        <main id="main-content">
          <Hero />
          <Projects />
          <Publications />
          <Team useAltTheme={accentIndex !== 0} />
          <Contact />
        </main>
        <Footer />
      </div>
      <CookieBanner analyticsEnabled={posthogInitialized} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Mount — fetch PostHog config from server, init if enabled, then render
// ---------------------------------------------------------------------------
function mount() {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  );
}

fetch("/api/posthog-config")
  .then((res) => res.json())
  .then(({ key, host, enabled }: { key: string; host: string; enabled: boolean }) => {
    if (enabled && key) {
      posthog.init(key, {
        api_host: host,
        // --- GDPR compliance (Uni Münster Datenschutz) ---
        opt_out_capturing_by_default: true,  // No data sent until explicit consent
        respect_dnt: true,                   // Honor browser Do Not Track
        ip: false,                           // Never send full IP (policy: only 2 bytes)
        capture_pageview: true,              // Track accessed pages
        capture_pageleave: true,             // Track time spent on pages
        autocapture: false,                  // Only capture page views, not clicks/inputs
        disable_session_recording: true,     // No session replays
        enable_heatmaps: false,              // No heatmaps
        persistence: "localStorage+cookie",  // Opt-out cookie survives like Matomo's
      });
      posthogInitialized = true;
      const consent = localStorage.getItem("analytics_consent");
      if (consent === "accepted") posthog.opt_in_capturing();
    }
    mount();
  })
  .catch(() => mount());
