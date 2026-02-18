import React, { useEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import membersData from "../data/members.json";
import projectsData from "../data/projects.json";
import publicationsData from "../data/publications.json";
import frankHead from "../data/frank.png";

// Frank mode easter egg
const FRANK_MODE = new URLSearchParams(window.location.search).get("frank_mode") === "true";
const FRANK_IMG_URL = frankHead //"https://www.uni-muenster.de/imperia/md/images/organisch_chemisches_institut2/glorius/icons_frank_glorius.png";

// Molecule-shape starting distribution flag (?molecule_mode=true)
const MOLECULE_MODE = new URLSearchParams(window.location.search).get("molecule_mode") === "true";

// ---------------------------------------------------------------------------
// Molecule shape definitions (coordinates normalised to ~0..1 range)
// Each molecule is an array of { x, y } atom positions and bond pairs.
// ---------------------------------------------------------------------------
interface MoleculeShape {
  name: string;
  atoms: { x: number; y: number }[];
}

const MOLECULE_SHAPES: MoleculeShape[] = [
  {
    // Benzene ring (regular hexagon)
    name: "benzene",
    atoms: Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((Math.PI / 3) * i - Math.PI / 2),
      y: Math.sin((Math.PI / 3) * i - Math.PI / 2),
    })),
  },
  {
    // Water (V-shape, 104.5 degree angle)
    name: "water",
    atoms: [
      { x: 0, y: 0 },                                          // O
      { x: -Math.sin(52.25 * Math.PI/180), y: Math.cos(52.25 * Math.PI/180) },  // H
      { x:  Math.sin(52.25 * Math.PI/180), y: Math.cos(52.25 * Math.PI/180) },  // H
    ],
  },
  {
    // Methane (tetrahedral 2D projection – central C with 4 H)
    name: "methane",
    atoms: [
      { x: 0, y: 0 },
      { x: 0, y: -1 },
      { x: -0.94, y: 0.34 },
      { x: 0.94, y: 0.34 },
      { x: 0, y: 0.8 },
    ],
  },
  {
    // Ethanol (C-C-O chain with hydrogens)
    name: "ethanol",
    atoms: [
      { x: -1, y: 0 },       // C1
      { x: 0, y: 0 },        // C2
      { x: 1, y: 0 },        // O
      { x: 1.7, y: 0.5 },    // H (on O)
      { x: -1.5, y: -0.7 },  // H
      { x: -1.5, y: 0.7 },   // H
      { x: -0.5, y: -0.7 },  // H (on C1 side)
      { x: 0.5, y: -0.7 },   // H
      { x: 0.5, y: 0.7 },    // H
    ],
  },
  {
    // Cyclohexane (6-membered ring, chair-like 2D)
    name: "cyclohexane",
    atoms: Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((Math.PI / 3) * i),
      y: Math.sin((Math.PI / 3) * i),
    })),
  },
  {
    // Acetylene (linear H-C≡C-H)
    name: "acetylene",
    atoms: [
      { x: -1.5, y: 0 },
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1.5, y: 0 },
    ],
  },
  {
    // Naphthalene (two fused benzene rings)
    name: "naphthalene",
    atoms: [
      // Left ring
      { x: -1.5, y: -0.87 },
      { x: -2.5, y: -0.87 },
      { x: -3.0, y: 0 },
      { x: -2.5, y: 0.87 },
      { x: -1.5, y: 0.87 },
      { x: -1.0, y: 0 },
      // Right ring (shares edge 0-5 mapped to 5-0 bridge)
      { x: 0, y: 0 },
      { x: 0.5, y: -0.87 },
      { x: -0.5, y: -0.87 },
      { x: 0.5, y: 0.87 },
      { x: -0.5, y: 0.87 },
    ],
  },
  {
    // Pyridine (benzene with one N, same hex shape)
    name: "pyridine",
    atoms: Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((Math.PI / 3) * i + Math.PI / 6),
      y: Math.sin((Math.PI / 3) * i + Math.PI / 6),
    })),
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Member {
  name: string;
  role: string;
  image: string;
  email: string;
  description: string;
  links: Record<string, string>;
}

interface Project {
  name: string;
  description: string;
  url: string;
  language: string;
  license: string;
  tags: string[];
  image?: string; 
}

interface Publication {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume: string;
  pages: string;
  doi: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #22d3ee, #0891b2)",
  "linear-gradient(135deg, #3b82f6, #2563eb)",
  "linear-gradient(135deg, #22d3ee, #3b82f6)",
  "linear-gradient(135deg, #06b6d4, #0891b2)",
  "linear-gradient(135deg, #0ea5e9, #0284c7)",
  "linear-gradient(135deg, #3b82f6, #6366f1)",
  "linear-gradient(135deg, #22d3ee, #06b6d4)",
  "linear-gradient(135deg, #0ea5e9, #22d3ee)",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const cleaned = name.replace(/Prof\.\s*|Dr\.\s*/g, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarGradient(name: string): string {
  return AVATAR_GRADIENTS[hashCode(name) % AVATAR_GRADIENTS.length];
}

// ---------------------------------------------------------------------------
// Link Icons
// ---------------------------------------------------------------------------
const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 4L12 13 2 4" />
  </svg>
);

const WebsiteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" />
  </svg>
);

const ScholarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L1 9l11 6 9-4.91V17" />
    <path d="M5 13.18v4.82a9.82 9.82 0 007 3 9.82 9.82 0 007-3v-4.82" />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const OrcidIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M10 8v8" />
    <path d="M13 8h1a3 3 0 010 6h-1" />
    <path d="M13 8v8" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const linkIconMap: Record<string, React.FC> = {
  email: EmailIcon,
  website: WebsiteIcon,
  scholar: ScholarIcon,
  github: GithubIcon,
  linkedin: LinkedInIcon,
  orcid: OrcidIcon,
};

// ---------------------------------------------------------------------------
// MoleculeCanvas - Blueprint-style with mouse repulsion + Frank Mode
// ---------------------------------------------------------------------------
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  isNode: boolean;
}

function MoleculeCanvas({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const frankImgRef = useRef<HTMLImageElement | null>(null);
  const frankLoadedRef = useRef(false);

  // Preload Frank image
  useEffect(() => {
    if (!FRANK_MODE) return;
    
    const img = new Image();
    // REMOVED: img.crossOrigin = "anonymous";  <-- This was causing the block
    
    img.onload = () => {
      frankImgRef.current = img;
      frankLoadedRef.current = true;
      // frankImgRef.current.
      console.log("Frank Mode: Image loaded successfully.");
    };
    
    img.onerror = (e) => {
      console.error("Frank Mode: Failed to load image. Check the URL.", e);
      // Fallback: If image fails, you might want to force a reload or disable the mode
      // typically this happens if the URL is 404
    };

    img.src = FRANK_IMG_URL;
  }, []);

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];

    if (MOLECULE_MODE) {
      // Place molecules on an evenly-spaced grid with slight jitter
      const scale = Math.min(w, h) * 0.06;
      const padding = scale * 2.5;
      const usableW = w - 2 * padding;
      const usableH = h - 2 * padding;

      // Determine grid dimensions that fill the viewport nicely
      const aspect = usableW / usableH;
      const cols = Math.round(Math.sqrt(MOLECULE_SHAPES.length * aspect));
      const rows = Math.ceil(MOLECULE_SHAPES.length / cols);
      const cellW = usableW / cols;
      const cellH = usableH / rows;
      // Max jitter so molecules stay well inside their cell
      const jitterX = cellW * 0.2;
      const jitterY = cellH * 0.2;

      for (let m = 0; m < MOLECULE_SHAPES.length; m++) {
        const shape = MOLECULE_SHAPES[m];
        if (!shape) continue;
        const col = m % cols;
        const row = Math.floor(m / cols);
        const cx = padding + cellW * (col + 0.5) + (Math.random() - 0.5) * 2 * jitterX;
        const cy = padding + cellH * (row + 0.5) + (Math.random() - 0.5) * 2 * jitterY;
        const rotation = Math.random() * Math.PI * 2;
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);

        for (let a = 0; a < shape.atoms.length; a++) {
          const atom = shape.atoms[a];
          if (!atom) continue;
          const rx = atom.x * cosR - atom.y * sinR;
          const ry = atom.x * sinR + atom.y * cosR;
          particles.push({
            x: cx + rx * scale,
            y: cy + ry * scale,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            r: a === 0 ? 6 : 4 + Math.random() * 2,
            isNode: a === 0,
          });
        }
      }
    } else {
      // Default random distribution
      const count = FRANK_MODE ? 45 : 65;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: FRANK_MODE ? 15 + Math.random() * 15 : 5.0 + Math.random() * 3.5,
          isNode: i % 5 === 0,
        });
      }
    }

    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Force re-init if empty or if mode changed (though mode is constant per session)
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    document.addEventListener("mouseleave", handleMouseLeave);

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Blueprint palette
      const baseColor = isDark ? "34, 211, 238" : "8, 145, 178";
      const nodeAlpha = isDark ? 0.55 : 0.45;
      const dotAlpha = isDark ? 0.4 : 0.3;
      const lineAlpha = isDark ? 0.12 : 0.08;
      const crossAlpha = isDark ? 0.25 : 0.18;

      // Weak inter-particle repulsion to avoid overlap
      const repelDist = 30;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pI = particles[i]!;
          const pJ = particles[j]!;
          const ddx = pI.x - pJ.x;
          const ddy = pI.y - pJ.y;
          const dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd < repelDist && dd > 0) {
            const f = ((repelDist - dd) / repelDist) * 0.04;
            const fx = (ddx / dd) * f;
            const fy = (ddy / dd) * f;
            pI.vx += fx;
            pI.vy += fy;
            pJ.vx -= fx;
            pJ.vy -= fy;
          }
        }
      }

      // Update positions
      for (const p of particles) {
        // Mouse REPULSION
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = FRANK_MODE ? 250 : 160; 
        
        if (dist < repelRadius && dist > 0) {
          const force = (repelRadius - dist) / repelRadius;
          p.vx += (dx / dist) * force * 0.2;
          p.vy += (dy / dist) * force * 0.2;
        }

        // Brownian motion – small random nudge each frame
        p.vx += (Math.random() - 0.5) * 0.03;
        p.vy += (Math.random() - 0.5) * 0.03;

        // Damping
        p.vx *= 0.985;
        p.vy *= 0.985;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;
      }

      // Draw connections (always distance-based)
      const connectionDist = 200;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pI = particles[i];
          const pJ = particles[j];
          if (!pI || !pJ) continue;
          const dx = pI.x - pJ.x;
          const dy = pI.y - pJ.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist);
            ctx.beginPath();
            ctx.moveTo(pI.x, pI.y);
            ctx.lineTo(pJ.x, pJ.y);
            ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // Draw particles (or Frank heads)
      if (FRANK_MODE && frankLoadedRef.current && frankImgRef.current) {
        const img = frankImgRef.current;
        
        // Calculate crop for "object-fit: cover"
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        for (const p of particles) {
          const size = p.r * 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.clip();
          
          // 9-argument drawImage: (img, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH)
          ctx.drawImage(
            img, 
            sx, sy, minDim, minDim,   // Crop a square from the center of the source image
            p.x - p.r, p.y - p.r, size, size // Draw it into the circle on canvas
          );
          
          ctx.restore();
          
          // Subtle glow ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${baseColor}, ${dotAlpha * 0.8})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      } else {
        // Fallback: Standard Dots
        // (Also renders this if Frank Mode is on but image hasn't loaded yet)
        for (const p of particles) {
          const alpha = p.isNode ? nodeAlpha : dotAlpha;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${baseColor}, ${alpha})`;
          ctx.fill();

          if (p.isNode) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${baseColor}, ${alpha * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          if (particles.indexOf(p) % 7 === 0) {
            const s = 6;
            ctx.beginPath();
            ctx.moveTo(p.x - s, p.y);
            ctx.lineTo(p.x + s, p.y);
            ctx.moveTo(p.x, p.y - s);
            ctx.lineTo(p.x, p.y + s);
            ctx.strokeStyle = `rgba(${baseColor}, ${crossAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isDark, initParticles]);

  return <canvas ref={canvasRef} id="molecule-canvas" />;
}

// ---------------------------------------------------------------------------
// Scroll Reveal Hook
// ---------------------------------------------------------------------------
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );
    const targets = el.querySelectorAll(".reveal");
    targets.forEach((t) => observer.observe(t));
    if (el.classList.contains("reveal")) observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return ref;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function Nav({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
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
        <li><a href="#contact" onClick={scrollTo("contact")}>Contact</a></li>
      </ul>
      <button
        className={`theme-switch ${isDark ? "" : "light"}`}
        onClick={onToggle}
        aria-label="Toggle theme"
      >
        <span className="theme-switch__label">{isDark ? "Dark" : "Light"}</span>
        <div className="theme-switch__track">
          <div className="theme-switch__thumb" />
        </div>
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      <div className="hero__label">DATA SCIENCE SUBGROUP</div>
      <h1 className="hero__title">
        Machine Learning<br />
        <span className="hero__title-accent">for Chemistry</span>
      </h1>
      <p className="hero__subtitle">
        Organisch-Chemisches Institut &middot; University of M&uuml;nster &middot; Glorius Lab
      </p>
      <div className="hero__buttons">
        <a href="#projects" className="hero__btn" onClick={scrollTo("projects")}>
          Our Projects &darr;
        </a>
        <a href="#team" className="hero__btn" onClick={scrollTo("team")}>
          Meet the Team &darr;
        </a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Projects (replaces About + Research)
// ---------------------------------------------------------------------------
function Projects() {
  const ref = useScrollReveal();
  const projects = projectsData as Project[];

  return (
    <section className="section" id="projects" ref={ref}>
      <div className="reveal">
        <div className="section__label">OPEN SOURCE</div>
        <h2 className="section__heading">GitHub Projects</h2>
      </div>
      <div className="project-grid">
        {projects.map((proj, i) => (
          <a
            className={`project-card reveal reveal-delay-${i + 1}`}
            key={proj.name}
            href={proj.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* 1. Header: Name + Link (Github Icon removed) */}
            <div className="project-card__header">
              {/* Removed <GithubIcon /> here */}
              <h3 className="project-card__name" style={{ marginLeft: 0 }}>
                {proj.name}
              </h3>
              <ExternalLinkIcon />
            </div>

            {/* 2. Image Section */}
            {proj.image && (
              <div 
                className="project-card__image-wrapper"
                style={{
                  marginTop: "0.75rem",
                  marginBottom: "0.75rem",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid rgba(128, 128, 128, 0.2)",
                  width: "100%", 
                  height: "250px",
              
                }}
              >
                <img 
                  src={proj.image} 
                  alt={proj.name} 
                  style={{ 
                    width: "100%", 
                    height: "100%",
                    // justifyContent: "center",
                    objectFit: "contain", // 2. COVERS the area (crops edges, doesn't squish)
                    display: "block" 
                  }} 
                />
              </div>
            )}

            {/* 3. Infos */}
            <p className="project-card__desc">{proj.description}</p>
            <div className="project-card__meta">
              <span className="project-card__lang">
                <span className="project-card__lang-dot" />
                {proj.language}
              </span>
              <span className="project-card__license">{proj.license}</span>
            </div>
            <div className="project-card__tags">
              {proj.tags.map((tag) => (
                <span className="project-card__tag" key={tag}>{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Publications
// ---------------------------------------------------------------------------
function Publications() {
  const ref = useScrollReveal();
  const pubs = (publicationsData as Publication[])
    .slice()
    .sort((a, b) => b.year - a.year);

  return (
    <section className="section" id="publications" ref={ref}>
      <div className="reveal">
        <div className="section__label">PUBLICATIONS</div>
        <h2 className="section__heading">Selected Works</h2>
      </div>
      <div className="publications-list">
        {pubs.map((pub, i) => (
          <div
            className={`pub-card reveal reveal-delay-${Math.min(i + 1, 10)}`}
            key={pub.title}
          >
            <div className="pub-card__year">{pub.year}</div>
            <div className="pub-card__body">
              <div className="pub-card__title">{pub.title}</div>
              <div className="pub-card__authors">{pub.authors.join(", ")}</div>
              <div className="pub-card__journal">
                <em>{pub.journal}</em>
                {pub.volume && <>{" "}{pub.volume}</>}
                {pub.pages && <>, {pub.pages}</>}
              </div>
              <div className="pub-card__footer">
                {pub.doi && (
                  <a
                    className="pub-card__doi"
                    href={pub.doi}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    DOI &rarr;
                  </a>
                )}
                {pub.tags.map((tag) => (
                  <span className="pub-card__tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
function TeamCard({ member, index }: { member: Member; index: number }) {
  const hasImage = member.image && member.image.trim() !== "";

  return (
    <div
      className={`team-card reveal reveal-delay-${Math.min(index + 1, 12)}`}
    >
      <div
        className="team-card__avatar"
        style={
          hasImage ? {} : { background: getAvatarGradient(member.name) }
        }
      >
        {hasImage ? (
          <img src={member.image} alt={member.name} />
        ) : (
          getInitials(member.name)
        )}
      </div>
      <h3 className="team-card__name">{member.name}</h3>
      <div className="team-card__role">{member.role}</div>
      <p className="team-card__desc">{member.description}</p>
      <div className="team-card__links">
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            title="Email"
            aria-label={`Email ${member.name}`}
          >
            <EmailIcon />
          </a>
        )}
        {Object.entries(member.links || {}).map(([key, url]) => {
          const Icon = linkIconMap[key];
          if (!Icon) return null;
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={key}
              aria-label={`${key} link for ${member.name}`}
            >
              <Icon />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function Team() {
  const ref = useScrollReveal();
  const members = membersData as Member[];

  return (
    <section className="section" id="team" ref={ref}>
      <div className="reveal">
        <div className="section__label">TEAM</div>
        <h2 className="section__heading">Our Researchers</h2>
      </div>
      <div className="team-grid">
        {members.map((m, i) => (
          <TeamCard key={m.name} member={m} index={i} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------
function Contact() {
  const ref = useScrollReveal();
  return (
    <section className="section" id="contact" ref={ref}>
      <div className="reveal">
        <div className="section__label">CONTACT</div>
        <h2 className="section__heading">Get in Touch</h2>
      </div>
      <div className="card contact__card reveal reveal-delay-1">
        <address className="contact__address">
          Organisch-Chemisches Institut<br />
          Corrensstra&szlig;e 36<br />
          48149 M&uuml;nster, Germany
        </address>
        <div>
          <a
            className="contact__link"
            href="mailto:glorius@uni-muenster.de"
          >
            <EmailIcon />
            glorius@uni-muenster.de
          </a>
          <a
            className="contact__uni-link"
            href="https://www.uni-muenster.de/Chemie.oc/glorius/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLinkIcon />
            Glorius Lab Website
          </a>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="footer">
      <p className="footer__text">
        &copy; 2025 Glorius Lab &mdash; Data Science Subgroup
        <span>University of M&uuml;nster</span>
      </p>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.add("light-mode");
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  return (
    <>
      <MoleculeCanvas isDark={isDark} />
      <div className="content-layer">
        <Nav isDark={isDark} onToggle={toggleTheme} />
        <Hero />
        <Projects />
        <Publications />
        <Team />
        <Contact />
        <Footer />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
