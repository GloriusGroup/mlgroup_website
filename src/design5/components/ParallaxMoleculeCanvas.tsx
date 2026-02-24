import React, { useEffect, useRef } from "react";
import { memberImages, memberCodes } from "../../data/assets/members";

// Easter egg: ?member=NDO → particles become that member's face (3-letter codes)
const MEMBER_MODE_PARAM = new URLSearchParams(window.location.search).get("member")?.toUpperCase() ?? null;
const MEMBER_IMG_URL = MEMBER_MODE_PARAM
  ? memberCodes[MEMBER_MODE_PARAM] ?? memberImages[MEMBER_MODE_PARAM] ?? null
  : null;

// ---------------------------------------------------------------------------
// Depth layers — each represents a plane at a different "distance"
// Parallax is scroll-only: far particles barely shift, near particles drift
// significantly as you scroll, creating depth.
// ---------------------------------------------------------------------------
interface LayerConfig {
  scrollSpeed: number;
  count: number;
  sizeRange: [number, number];
  alphaRange: [number, number];
  connectionDist: number;
  lineWidth: number;
  drift: number;
  nodeRatio: number;
}

const LAYERS: LayerConfig[] = [
  {
    // Far — nearly static backdrop, like distant stars
    scrollSpeed: 0.02,
    count: 20,
    sizeRange: [1, 2.2],
    alphaRange: [0.05, 0.12],
    connectionDist: 80,
    lineWidth: 0.3,
    drift: 0.04,
    nodeRatio: 0.1,
  },
  {
    // Mid — primary structure, moderate shift
    scrollSpeed: 0.2,
    count: 50,
    sizeRange: [3.5, 6],
    alphaRange: [0.2, 0.4],
    connectionDist: 170,
    lineWidth: 0.65,
    drift: 0.18,
    nodeRatio: 0.2,
  },
  {
    // Near — bold foreground, moves dramatically past you
    scrollSpeed: 0.65,
    count: 60,
    sizeRange: [7.5, 9],
    alphaRange: [0.35, 0.55],
    connectionDist: 200,
    lineWidth: 0.8,
    drift: 0.3,
    nodeRatio: 0.25,
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  isNode: boolean;
  layer: number;
  idx: number;
  phase: number;
}

export function ParallaxMoleculeCanvas({
  isDark,
  accentRgb,
}: {
  isDark: boolean;
  accentRgb: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const scrollRef = useRef(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const timeRef = useRef(0);
  const memberImgRef = useRef<HTMLImageElement | null>(null);
  const memberLoadedRef = useRef(false);

  useEffect(() => {
    if (!MEMBER_IMG_URL) return;
    const img = new Image();
    img.onload = () => {
      memberImgRef.current = img;
      memberLoadedRef.current = true;
    };
    img.src = MEMBER_IMG_URL;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const initParticles = (w: number, h: number) => {
      const particles: Particle[] = [];
      // Scale particle count by screen area (counts tuned for ~1920×1080)
      const scale = Math.min(1, (w * h) / (1920 * 1080));
      for (let li = 0; li < LAYERS.length; li++) {
        const cfg = LAYERS[li]!;
        const count = Math.max(3, Math.round(cfg.count * scale));
        const [sMin, sMax] = cfg.sizeRange;
        const [aMin, aMax] = cfg.alphaRange;
        for (let i = 0; i < count; i++) {
          const memberScale = MEMBER_IMG_URL ? 2.5 : 1;
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * cfg.drift * 2,
            vy: (Math.random() - 0.5) * cfg.drift * 2,
            r: (sMin + Math.random() * (sMax - sMin)) * memberScale,
            alpha: aMin + Math.random() * (aMax - aMin),
            isNode: i < count * cfg.nodeRatio,
            layer: li,
            idx: i,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      particlesRef.current = particles;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

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
      const scrollY = scrollRef.current;
      const mouse = mouseRef.current;
      timeRef.current += 0.006;
      const time = timeRef.current;

      const baseColor = accentRgb;

      // Pre-compute scroll offsets per layer
      const buf = 80;
      const wrapH = h + buf * 2;
      const scrollOffsets = LAYERS.map((cfg) => -scrollY * cfg.scrollSpeed);

      // Helper: get rendered Y for a particle (base Y + scroll offset, wrapped)
      const renderedY = (p: Particle) => {
        const raw = p.y + scrollOffsets[p.layer]!;
        return ((raw % wrapH) + wrapH) % wrapH - buf;
      };

      // --- Physics ---
      // Inter-particle soft repulsion (within same layer, using rendered positions)
      const repelDist = 30;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pI = particles[i]!;
          const pJ = particles[j]!;
          if (pI.layer !== pJ.layer) continue;
          const ddx = pI.x - pJ.x;
          const ddy = renderedY(pI) - renderedY(pJ);
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
        // Mouse repulsion against RENDERED position so it matches what you see
        if (mouse.x > -9000) {
          const ry = renderedY(p);
          const dx = p.x - mouse.x;
          const dy = ry - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const repelR = MEMBER_IMG_URL ? 250 : 160;
          if (dist < repelR && dist > 0) {
            const force = (repelR - dist) / repelR;
            p.vx += (dx / dist) * force * 0.2;
            p.vy += (dy / dist) * force * 0.2;
          }
        }

        // Drift + damping
        p.vx += (Math.random() - 0.5) * 0.03;
        p.vy += (Math.random() - 0.5) * 0.03;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap base positions — X wraps independently, Y must match wrapH
        // so the modulo in renderedY stays continuous across the seam
        if (p.x < -50) p.x += w + 100;
        if (p.x > w + 50) p.x -= w + 100;
        if (p.y < -buf) p.y += wrapH;
        if (p.y > h + buf) p.y -= wrapH;
      }

      // --- Render layers far → near (painter's order) ---
      for (let li = 0; li < LAYERS.length; li++) {
        const cfg = LAYERS[li]!;
        const layerPs = particles.filter((p) => p.layer === li);

        // Rendered positions: base position + scroll parallax offset, wrapped vertically
        const rendered = layerPs.map((p) => {
          const py = renderedY(p);
          return { px: p.x, py, p };
        });

        // Connections
        for (let i = 0; i < rendered.length; i++) {
          for (let j = i + 1; j < rendered.length; j++) {
            const a = rendered[i]!;
            const b = rendered[j]!;
            const dx = a.px - b.px;
            const dy = a.py - b.py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cfg.connectionDist) {
              const connAlpha =
                (1 - dist / cfg.connectionDist) *
                ((cfg.alphaRange[0] + cfg.alphaRange[1]) * 0.5);
              ctx.beginPath();
              ctx.moveTo(a.px, a.py);
              ctx.lineTo(b.px, b.py);
              ctx.strokeStyle = `rgba(${baseColor}, ${connAlpha})`;
              ctx.lineWidth = cfg.lineWidth;
              ctx.stroke();
            }
          }
        }

        // Particles
        const useMemberImg = MEMBER_IMG_URL && memberLoadedRef.current && memberImgRef.current;
        for (const { px, py, p } of rendered) {
          if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

          const breathe = Math.sin(time * 1.8 + p.phase) * 0.05;
          const a = Math.max(0, p.alpha + breathe);

          if (useMemberImg) {
            const img = memberImgRef.current!;
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            const size = p.r * 2;

            ctx.save();
            ctx.globalAlpha = a * 1.8;
            ctx.beginPath();
            ctx.arc(px, py, p.r, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, sx, sy, minDim, minDim, px - p.r, py - p.r, size, size);
            ctx.restore();

            ctx.beginPath();
            ctx.arc(px, py, p.r + 2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${baseColor}, ${a * 0.6})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          } else {
            // Dot
            ctx.beginPath();
            ctx.arc(px, py, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${baseColor}, ${a})`;
            ctx.fill();

            // Node ring
            if (p.isNode) {
              ctx.beginPath();
              ctx.arc(px, py, p.r + 5, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(${baseColor}, ${a * 0.3})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }

            // Cross markers (same pattern as original: every 7th particle)
            if (p.idx % 7 === 0) {
              const s = 6;
              ctx.beginPath();
              ctx.moveTo(px - s, py);
              ctx.lineTo(px + s, py);
              ctx.moveTo(px, py - s);
              ctx.lineTo(px, py + s);
              ctx.strokeStyle = `rgba(${baseColor}, ${a * 0.4})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isDark, accentRgb]);

  return <canvas ref={canvasRef} id="molecule-canvas" />;
}
