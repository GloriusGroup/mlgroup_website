import React, { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "../shared/icons";

export function Nav({
  isDark,
  onToggle,
  accentName,
  onCycleAccent,
  devSwitchEnabled,
}: {
  isDark: boolean;
  onToggle: () => void;
  accentName: string;
  onCycleAccent: () => void;
  devSwitchEnabled: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav__logo">
        <span className="nav__logo-main">GLORIUS LAB</span>
        <span className="nav__logo-suffix">/ ML</span>
      </div>
      <button
        className={`nav-mobile-toggle ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        <span />
        <span />
        <span />
      </button>
      <ul className={`nav__center ${mobileOpen ? "mobile-open" : ""}`}>
        <li><a href="#projects" onClick={scrollTo("projects")}>Projects</a></li>
        <li><a href="#publications" onClick={scrollTo("publications")}>Publications</a></li>
        <li><a href="#team" onClick={scrollTo("team")}>Team</a></li>
        <li><a href="#funding" onClick={scrollTo("funding")}>Funding</a></li>
        <li><a href="#contact" onClick={scrollTo("contact")}>Contact</a></li>
      </ul>
      {devSwitchEnabled && (
        <button
          className={`dev-switch ${accentName !== "Cyan" ? "active" : ""}`}
          onClick={onCycleAccent}
          aria-label="Cycle accent color"
        >
          <span className="dev-switch__badge">DEV</span>
          {accentName}
        </button>
      )}
      <button
        className={`theme-switch ${isDark ? "" : "light"}`}
        onClick={onToggle}
        aria-label="Toggle theme"
      >
        <div className="theme-switch__track">
          <span className="theme-switch__icon theme-switch__icon--moon"><MoonIcon /></span>
          <span className="theme-switch__icon theme-switch__icon--sun"><SunIcon /></span>
          <div className="theme-switch__thumb" />
        </div>
      </button>
    </nav>
    </>
  );
}
