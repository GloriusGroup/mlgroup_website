import React, { useEffect, useRef, useCallback } from "react";
import frankHead from "../../data/frank.png";

// Easter egg flags
const FRANK_MODE = new URLSearchParams(window.location.search).get("frank_mode") === "true";
const FRANK_IMG_URL = frankHead;
const MOLECULE_MODE = new URLSearchParams(window.location.search).get("molecule_mode") === "true";

interface MoleculeShape {
  name: string;
  atoms: { x: number; y: number }[];
}

const MOLECULE_SHAPES: MoleculeShape[] = [
  {
    name: "benzene",
    atoms: Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((Math.PI / 3) * i - Math.PI / 2),
      y: Math.sin((Math.PI / 3) * i - Math.PI / 2),
    })),
  },
  {
    name: "water",
    atoms: [
      { x: 0, y: 0 },
      { x: -Math.sin(52.25 * Math.PI / 180), y: Math.cos(52.25 * Math.PI / 180) },
      { x: Math.sin(52.25 * Math.PI / 180), y: Math.cos(52.25 * Math.PI / 180) },
    ],
  },
  {
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
    name: "ethanol",
    atoms: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1.7, y: 0.5 },
      { x: -1.5, y: -0.7 },
      { x: -1.5, y: 0.7 },
      { x: -0.5, y: -0.7 },
      { x: 0.5, y: -0.7 },
      { x: 0.5, y: 0.7 },
    ],
  },
  {
    name: "cyclohexane",
    atoms: Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((Math.PI / 3) * i),
      y: Math.sin((Math.PI / 3) * i),
    })),
  },
  {
    name: "acetylene",
    atoms: [
      { x: -1.5, y: 0 },
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1.5, y: 0 },
    ],
  },
  {
    name: "naphthalene",
    atoms: [
      { x: -1.5, y: -0.87 },
      { x: -2.5, y: -0.87 },
      { x: -3.0, y: 0 },
      { x: -2.5, y: 0.87 },
      { x: -1.5, y: 0.87 },
      { x: -1.0, y: 0 },
      { x: 0, y: 0 },
      { x: 0.5, y: -0.87 },
      { x: -0.5, y: -0.87 },
      { x: 0.5, y: 0.87 },
      { x: -0.5, y: 0.87 },
    ],
  },
  {
    name: "pyridine",
    atoms: Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((Math.PI / 3) * i + Math.PI / 6),
      y: Math.sin((Math.PI / 3) * i + Math.PI / 6),
    })),
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  isNode: boolean;
}

export function MoleculeCanvas({ isDark, useAltTheme }: { isDark: boolean; useAltTheme: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const frankImgRef = useRef<HTMLImageElement | null>(null);
  const frankLoadedRef = useRef(false);

  useEffect(() => {
    if (!FRANK_MODE) return;
    const img = new Image();
    img.onload = () => {
      frankImgRef.current = img;
      frankLoadedRef.current = true;
    };
    img.onerror = (e) => {
      console.error("Frank Mode: Failed to load image.", e);
    };
    img.src = FRANK_IMG_URL;
  }, []);

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];

    if (MOLECULE_MODE) {
      const scale = Math.min(w, h) * 0.06;
      const padding = scale * 2.5;
      const usableW = w - 2 * padding;
      const usableH = h - 2 * padding;
      const aspect = usableW / usableH;
      const cols = Math.round(Math.sqrt(MOLECULE_SHAPES.length * aspect));
      const rows = Math.ceil(MOLECULE_SHAPES.length / cols);
      const cellW = usableW / cols;
      const cellH = usableH / rows;
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
      // "208, 184, 190"
      const baseColor = useAltTheme
        ? (isDark ? "255, 255, 255" : "155, 27, 48")
        : (isDark ? "34, 211, 238" : "8, 145, 178");
      const nodeAlpha = isDark ? 0.55 : 0.45;
      const dotAlpha = isDark ? 0.4 : 0.3;
      const crossAlpha = isDark ? 0.25 : 0.18;

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

      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = FRANK_MODE ? 250 : 160;

        if (dist < repelRadius && dist > 0) {
          const force = (repelRadius - dist) / repelRadius;
          p.vx += (dx / dist) * force * 0.2;
          p.vy += (dy / dist) * force * 0.2;
        }

        p.vx += (Math.random() - 0.5) * 0.03;
        p.vy += (Math.random() - 0.5) * 0.03;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;
      }

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
            const alpha = 1 - dist / connectionDist;
            ctx.beginPath();
            ctx.moveTo(pI.x, pI.y);
            ctx.lineTo(pJ.x, pJ.y);
            ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      if (FRANK_MODE && frankLoadedRef.current && frankImgRef.current) {
        const img = frankImgRef.current;
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        for (const p of particles) {
          const size = p.r * 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, sx, sy, minDim, minDim, p.x - p.r, p.y - p.r, size, size);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${baseColor}, ${dotAlpha * 0.8})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      } else {
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
  }, [isDark, useAltTheme, initParticles]);

  return <canvas ref={canvasRef} id="molecule-canvas" />;
}
