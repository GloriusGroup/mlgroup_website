import React, { useEffect, useRef } from "react";
import { memberImages, memberCodes, allMemberUrls } from "../../data/assets/members";
import { MEMBER_MODE_PARAM, ALL_MODE } from "../shared/utils";

// Easter egg: ?member=NDO → particles become that member's face (3-letter codes)
// ?member=ALL → each particle gets a random member, equally distributed
// 1/100 chance of ALL mode activating automatically (computed in shared/utils)
const MEMBER_IMG_URL = ALL_MODE
  ? null
  : MEMBER_MODE_PARAM
    ? memberCodes[MEMBER_MODE_PARAM] ?? memberImages[MEMBER_MODE_PARAM] ?? null
    : null;
const MEMBER_MODE = ALL_MODE || !!MEMBER_IMG_URL;

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
  memberImgIdx: number;
  renderY: number;
  hasCross: boolean;
}

interface LayerFrameBuffers {
  x: Float32Array;
  y: Float32Array;
  bucketCounts: Uint16Array;
  lineBuckets: [Float32Array, Float32Array, Float32Array, Float32Array];
}

const IS_FIREFOX =
  typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);
const CANVAS_PERF_DEBUG =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("canvas_perf") === "1";

const FIREFOX_QUALITY_PROFILES = [
  { particleFraction: 0.5, lineFrameStride: 1, lineDistanceScale: 0, showDecorations: false },
  { particleFraction: 0.75, lineFrameStride: 1, lineDistanceScale: 0, showDecorations: false },
  { particleFraction: 1, lineFrameStride: 1, lineDistanceScale: 0, showDecorations: false },
] as const;

const FIREFOX_RENDER_INTERVALS = {
  idle: 1000 / 30,
  scroll: 1000 / 24,
  fastScroll: 1000 / 18,
  overloaded: 1000 / 14,
} as const;

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
  const allImgsRef = useRef<HTMLImageElement[]>([]);
  const allImgsLoadedRef = useRef(false);
  const perfOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ALL_MODE) {
      console.log(`[ParallaxCanvas] ALL_MODE active, loading ${allMemberUrls.length} member images...`);
      let done = 0;
      const imgs: HTMLImageElement[] = [];
      for (const url of allMemberUrls) {
        const img = new Image();
        img.onload = () => {
          done++;
          console.log(`[ParallaxCanvas] Image loaded (${done}/${allMemberUrls.length}): ${url.slice(-30)}`);
          if (!allImgsLoadedRef.current) {
            allImgsRef.current = imgs;
            allImgsLoadedRef.current = true;
          }
        };
        img.onerror = () => {
          done++;
          console.warn(`[ParallaxCanvas] Image FAILED (${done}/${allMemberUrls.length}): ${url.slice(-30)}`);
        };
        img.src = url;
        imgs.push(img);
      }
    } else if (MEMBER_IMG_URL) {
      const img = new Image();
      img.onload = () => {
        memberImgRef.current = img;
        memberLoadedRef.current = true;
      };
      img.src = MEMBER_IMG_URL;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { desynchronized: true });
    if (!ctx) return;

    const isFirefox = IS_FIREFOX;
    const firefoxDensityScale = 0.4;
    const firefoxRenderScale = 0.5;
    const renderScale = isFirefox ? firefoxRenderScale : 1;
    const minFrameTime = isFirefox ? 1000 / 40 : 0;
    const scrollOffsets = new Float32Array(LAYERS.length);
    const colorCache = new Map<number, string>();
    const spriteCache = new Map<string, HTMLCanvasElement>();
    const perfHost = window as Window & {
      __parallaxCanvasPerf?: {
        fps: number;
        frameMs: number;
        drawMs: number;
        particles: number;
        quality: number;
        firefox: boolean;
        scrolling: boolean;
      };
    };
    let lastFrameTime = 0;
    let lastVisualRender = 0;
    let frameCount = 0;
    let fpsFrameCount = 0;
    let fpsWindowStart = performance.now();
    let currentFps = 0;
    let emaFrameMs = 16.7;
    let emaDrawMs = 8;
    let qualityLevel = isFirefox ? 1 : 2;
    let qualityCooldown = 0;
    let scrollActiveUntil = 0;
    let lastScrollEventTime = performance.now();
    let lastScrollSampleY = window.scrollY;
    let scrollVelocity = 0;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let layerBuffers: LayerFrameBuffers[] = [];

    const toRgba = (alpha: number) => {
      const clamped = Math.max(0, Math.min(1, alpha));
      const key = Math.round(clamped * 1000);
      const cached = colorCache.get(key);
      if (cached) return cached;
      const value = `rgba(${accentRgb}, ${(key / 1000).toFixed(3)})`;
      colorCache.set(key, value);
      return value;
    };

    const getParticleSprite = (radius: number, isNode: boolean, hasCross: boolean) => {
      const key = `${Math.round(radius * 10)}:${isNode ? 1 : 0}:${hasCross ? 1 : 0}`;
      const cached = spriteCache.get(key);
      if (cached) return cached;

      const pad = hasCross ? 8 : isNode ? 6 : 2;
      const size = Math.ceil((radius + pad) * 2 + 2);
      const sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const spriteCtx = sprite.getContext("2d");
      if (!spriteCtx) return sprite;

      const center = size * 0.5;
      spriteCtx.fillStyle = `rgb(${accentRgb})`;
      spriteCtx.beginPath();
      spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
      spriteCtx.fill();

      if (isNode) {
        spriteCtx.strokeStyle = `rgba(${accentRgb}, 0.3)`;
        spriteCtx.lineWidth = 0.5;
        spriteCtx.beginPath();
        spriteCtx.arc(center, center, radius + 5, 0, Math.PI * 2);
        spriteCtx.stroke();
      }

      if (hasCross) {
        spriteCtx.strokeStyle = `rgba(${accentRgb}, 0.4)`;
        spriteCtx.lineWidth = 0.5;
        spriteCtx.beginPath();
        spriteCtx.moveTo(center - 6, center);
        spriteCtx.lineTo(center + 6, center);
        spriteCtx.moveTo(center, center - 6);
        spriteCtx.lineTo(center, center + 6);
        spriteCtx.stroke();
      }

      spriteCache.set(key, sprite);
      return sprite;
    };

    const initParticles = (w: number, h: number) => {
      const particles: Particle[] = [];
      const densityScale = isFirefox ? firefoxDensityScale : 1;
      const scale = Math.min(1, (w * h) / (1920 * 1080)) * densityScale;
      let globalIdx = 0;
      for (let li = 0; li < LAYERS.length; li++) {
        const cfg = LAYERS[li]!;
        const count = Math.max(3, Math.round(cfg.count * scale));
        const [sMin, sMax] = cfg.sizeRange;
        const [aMin, aMax] = cfg.alphaRange;
        for (let i = 0; i < count; i++) {
          const memberScale = MEMBER_MODE ? 2.5 : 1;
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
            memberImgIdx: ALL_MODE ? globalIdx % allMemberUrls.length : 0,
            renderY: 0,
            hasCross: i % 7 === 0,
          });
          globalIdx++;
        }
      }
      particlesRef.current = particles;
    };

    const layerGroups: Particle[][] = LAYERS.map(() => []);
    const rebuildLayerGroups = () => {
      for (const g of layerGroups) g.length = 0;
      for (const p of particlesRef.current) layerGroups[p.layer]!.push(p);
      layerBuffers = layerGroups.map((group) => {
        const pairCapacity = Math.max(4, group.length * (group.length - 1) * 2);
        return {
          x: new Float32Array(group.length),
          y: new Float32Array(group.length),
          bucketCounts: new Uint16Array(4),
          lineBuckets: [
            new Float32Array(pairCapacity),
            new Float32Array(pairCapacity),
            new Float32Array(pairCapacity),
            new Float32Array(pairCapacity),
          ],
        };
      });
    };

    const resize = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(viewportWidth * renderScale));
      canvas.height = Math.max(1, Math.floor(viewportHeight * renderScale));
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if (particlesRef.current.length === 0) {
        initParticles(viewportWidth, viewportHeight);
        rebuildLayerGroups();
      }
    };
    
    resize();
    window.addEventListener("resize", resize);

    const handleScroll = () => {
      const nextY = window.scrollY;
      const now = performance.now();
      const delta = Math.abs(nextY - lastScrollSampleY);
      const elapsed = Math.max(16, now - lastScrollEventTime);
      scrollVelocity = (delta / elapsed) * 16.67;
      scrollActiveUntil = now + 140;
      lastScrollEventTime = now;
      lastScrollSampleY = nextY;
      scrollRef.current = nextY;
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

    const animate = (timestamp: number) => {
      const now = performance.now();
      const isScrollActive = now < scrollActiveUntil;
      const firefoxRenderInterval = !isFirefox
        ? 0
        : emaDrawMs > 28
          ? FIREFOX_RENDER_INTERVALS.overloaded
          : isScrollActive
            ? scrollVelocity > 90
              ? FIREFOX_RENDER_INTERVALS.fastScroll
              : FIREFOX_RENDER_INTERVALS.scroll
            : FIREFOX_RENDER_INTERVALS.idle;
      const minRenderInterval = Math.max(minFrameTime, firefoxRenderInterval);
      if (minRenderInterval > 0 && timestamp - lastVisualRender < minRenderInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      lastVisualRender = timestamp;
      const deltaMs = lastFrameTime === 0 ? 1000 / 60 : Math.min(100, timestamp - lastFrameTime);
      const frameScale = Math.min(2.5, deltaMs / (1000 / 60));
      const damping = Math.pow(0.985, frameScale);
      lastFrameTime = timestamp;
      const drawStart = performance.now();
      frameCount++;
      fpsFrameCount++;

      const w = viewportWidth;
      const h = viewportHeight;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      if (layerGroups[0]!.length === 0) rebuildLayerGroups();
      const scrollY = scrollRef.current;
      const mouse = mouseRef.current;
      timeRef.current += 0.006 * frameScale;
      const time = timeRef.current;

      // Pre-compute scroll offsets per layer
      const buf = 80;
      const wrapH = h + buf * 2;
      for (let i = 0; i < LAYERS.length; i++) scrollOffsets[i] = -scrollY * LAYERS[i]!.scrollSpeed;

      // Inline renderedY to avoid function call overhead in hot loops
      const renderedY = (p: Particle) => {
        const raw = p.y + scrollOffsets[p.layer]!;
        return ((raw % wrapH) + wrapH) % wrapH - buf;
      };

      for (let i = 0; i < particles.length; i++) {
        particles[i]!.renderY = renderedY(particles[i]!);
      }

      // --- Physics (per-layer to skip cross-layer checks) ---
      const effectiveQualityLevel = isFirefox
        ? isScrollActive
          ? scrollVelocity > 90
            ? Math.min(qualityLevel, 1)
            : qualityLevel
          : qualityLevel
        : 2;
      const qualityProfile = FIREFOX_QUALITY_PROFILES[effectiveQualityLevel];

      // Skip O(n²) inter-particle repulsion entirely on Firefox — barely
      // noticeable visually but saves ~1000+ comparisons per frame.
      if (!isFirefox) {
        const repelDist = 30;
        const repelDistSq = repelDist * repelDist;
        for (let li = 0; li < LAYERS.length; li++) {
          const group = layerGroups[li]!;
          const activeCount = Math.max(3, Math.floor(group.length * qualityProfile.particleFraction));
          for (let i = 0; i < activeCount; i++) {
            const pI = group[i]!;
            for (let j = i + 1; j < activeCount; j++) {
              const pJ = group[j]!;
              const ddx = pI.x - pJ.x;
              if (ddx > repelDist || ddx < -repelDist) continue;
              const ddy = pI.renderY - pJ.renderY;
              if (ddy > repelDist || ddy < -repelDist) continue;
              const ddSq = ddx * ddx + ddy * ddy;
              if (ddSq < repelDistSq && ddSq > 0) {
                const dd = Math.sqrt(ddSq);
                const f = ((repelDist - dd) / repelDist) * 0.04 * frameScale;
                const fx = (ddx / dd) * f;
                const fy = (ddy / dd) * f;
                pI.vx += fx;
                pI.vy += fy;
                pJ.vx -= fx;
                pJ.vy -= fy;
              }
            }
          }
        }
      }

      const mouseActive = mouse.x > -9000;
      const repelR = MEMBER_MODE ? 250 : 160;
      const repelRSq = repelR * repelR;
      const edgeZone = isFirefox ? 0 : w * 0.18;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        // Mouse repulsion (O(n) — keep on Firefox for interactivity)
        if (mouseActive) {
          const dx = p.x - mouse.x;
          const dy = p.renderY - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < repelRSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (repelR - dist) / repelR;
            p.vx += (dx / dist) * force * 0.2 * frameScale;
            p.vy += (dy / dist) * force * 0.2 * frameScale;
          }
        }

        // Edge repulsion in hero viewport (skip on Firefox)
        if (edgeZone > 0) {
          if (p.renderY - scrollY > -50 && p.renderY - scrollY < h) {
            if (p.x < edgeZone) {
              const t = 1 - p.x / edgeZone;
              p.vx += t * t * 0.15 * frameScale;
            } else if (p.x > w - edgeZone) {
              const t = 1 - (w - p.x) / edgeZone;
              p.vx -= t * t * 0.15 * frameScale;
            }
          }
        }

        // Drift + damping
        p.vx += (Math.random() - 0.5) * 0.03 * frameScale;
        p.vy += (Math.random() - 0.5) * 0.03 * frameScale;
        p.vx *= damping;
        p.vy *= damping;
        p.x += p.vx * frameScale;
        p.y += p.vy * frameScale;

        if (p.x < -50) p.x += w + 100;
        if (p.x > w + 50) p.x -= w + 100;
        if (p.y < -buf) p.y += wrapH;
        if (p.y > h + buf) p.y -= wrapH;
        p.renderY = renderedY(p);
      }

      // --- Render layers far → near (painter's order) ---
      const useSingleImg = MEMBER_IMG_URL && memberLoadedRef.current && memberImgRef.current;
      const useAllImgs = ALL_MODE && allImgsLoadedRef.current && allImgsRef.current.length > 0;

      for (let li = 0; li < LAYERS.length; li++) {
        const cfg = LAYERS[li]!;
        const group = layerGroups[li]!;
        const buffers = layerBuffers[li]!;
        const rpx = buffers.x;
        const rpy = buffers.y;
        const activeCount = Math.max(3, Math.floor(group.length * qualityProfile.particleFraction));
        const shouldDrawLines =
          !isScrollActive &&
          qualityProfile.lineDistanceScale > 0 &&
          frameCount % qualityProfile.lineFrameStride === 0;
        const connDist = cfg.connectionDist * qualityProfile.lineDistanceScale;
        const connDistSq = connDist * connDist;
        const avgAlpha = (cfg.alphaRange[0] + cfg.alphaRange[1]) * 0.5;

        // Compute rendered positions into a reusable buffer
        for (let i = 0; i < activeCount; i++) {
          rpx[i] = group[i]!.x;
          rpy[i] = group[i]!.renderY;
        }

        // Batch connections by approximate alpha without allocating per-frame objects.
        const bucketCounts = buffers.bucketCounts;
        bucketCounts[0] = 0;
        bucketCounts[1] = 0;
        bucketCounts[2] = 0;
        bucketCounts[3] = 0;
        if (shouldDrawLines) {
          for (let i = 0; i < activeCount; i++) {
            const ax = rpx[i]!;
            const ay = rpy[i]!;
            for (let j = i + 1; j < activeCount; j++) {
              const dx = ax - rpx[j]!;
              if (dx > connDist || dx < -connDist) continue;
              const dy = ay - rpy[j]!;
              if (dy > connDist || dy < -connDist) continue;
              const distSq = dx * dx + dy * dy;
              if (distSq < connDistSq) {
                const dist = Math.sqrt(distSq);
                const alpha = (1 - dist / connDist) * avgAlpha;
                const bucket = Math.min(3, (alpha * 4) | 0);
                const lineBuffer = buffers.lineBuckets[bucket]!;
                const offset = bucketCounts[bucket] * 4;
                lineBuffer[offset] = ax;
                lineBuffer[offset + 1] = ay;
                lineBuffer[offset + 2] = rpx[j]!;
                lineBuffer[offset + 3] = rpy[j]!;
                bucketCounts[bucket]++;
              }
            }
          }
        }

        // Draw connection batches (one beginPath/stroke per bucket)
        ctx.lineWidth = cfg.lineWidth;
        for (let b = 0; b < 4; b++) {
          const lineCount = bucketCounts[b]!;
          if (lineCount === 0) continue;
          const lines = buffers.lineBuckets[b]!;
          const midAlpha = (b + 0.5) / 4 * avgAlpha;
          ctx.strokeStyle = toRgba(midAlpha);
          ctx.beginPath();
          for (let k = 0; k < lineCount * 4; k += 4) {
            ctx.moveTo(lines[k]!, lines[k + 1]!);
            ctx.lineTo(lines[k + 2]!, lines[k + 3]!);
          }
          ctx.stroke();
        }

        // Particles
        if (!useSingleImg && !useAllImgs) {
          for (let i = 0; i < activeCount; i++) {
            const p = group[i]!;
            const px = rpx[i]!;
            const py = rpy[i]!;
            if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

            // Skip per-particle sin() on Firefox — use static alpha
            const a = isFirefox ? p.alpha : Math.max(0, p.alpha + Math.sin(time * 1.8 + p.phase) * 0.05);

            if (isFirefox) {
              const sprite = getParticleSprite(
                p.r,
                qualityProfile.showDecorations && p.isNode,
                qualityProfile.showDecorations && p.hasCross,
              );
              ctx.globalAlpha = a;
              ctx.drawImage(sprite, px - sprite.width * 0.5, py - sprite.height * 0.5);
              ctx.globalAlpha = 1;
            } else {
              ctx.fillStyle = toRgba(a);
              ctx.beginPath();
              ctx.arc(px, py, p.r, 0, Math.PI * 2);
              ctx.fill();

              if (qualityProfile.showDecorations && p.isNode) {
                ctx.beginPath();
                ctx.arc(px, py, p.r + 5, 0, Math.PI * 2);
                ctx.strokeStyle = toRgba(a * 0.3);
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }

              if (qualityProfile.showDecorations && p.hasCross) {
                ctx.beginPath();
                ctx.moveTo(px - 6, py);
                ctx.lineTo(px + 6, py);
                ctx.moveTo(px, py - 6);
                ctx.lineTo(px, py + 6);
                ctx.strokeStyle = toRgba(a * 0.4);
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          }
        } else {
          // Member image mode
          for (let i = 0; i < activeCount; i++) {
            const p = group[i]!;
            const px = rpx[i]!;
            const py = rpy[i]!;
            if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

            const a = isFirefox ? p.alpha : Math.max(0, p.alpha + Math.sin(time * 1.8 + p.phase) * 0.05);

            const img = useAllImgs
              ? allImgsRef.current[p.memberImgIdx]
              : memberImgRef.current!;
            if (!img || !img.complete || img.naturalWidth === 0) {
              ctx.beginPath();
              ctx.arc(px, py, p.r * 0.4, 0, Math.PI * 2);
              ctx.fillStyle = toRgba(a);
              ctx.fill();
              continue;
            }
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
            ctx.strokeStyle = toRgba(a * 0.6);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      const drawMs = performance.now() - drawStart;
      emaFrameMs = emaFrameMs * 0.92 + deltaMs * 0.08;
      emaDrawMs = emaDrawMs * 0.92 + drawMs * 0.08;

      if (timestamp - fpsWindowStart >= 1000) {
        currentFps = (fpsFrameCount * 1000) / (timestamp - fpsWindowStart);
        fpsFrameCount = 0;
        fpsWindowStart = timestamp;
      }

      if (isFirefox) {
        if (qualityCooldown > 0) qualityCooldown--;
        if (qualityCooldown === 0 && emaDrawMs > 16 && qualityLevel > 0) {
          qualityLevel--;
          qualityCooldown = 45;
        } else if (qualityCooldown === 0 && emaDrawMs < 8 && currentFps > 27 && qualityLevel < 2) {
          qualityLevel++;
          qualityCooldown = 120;
        }
      }

      const qualityProfileForStats = isFirefox
        ? FIREFOX_QUALITY_PROFILES[effectiveQualityLevel]
        : FIREFOX_QUALITY_PROFILES[2];
      const visibleParticles = layerGroups.reduce(
        (sum, group) => sum + Math.max(3, Math.floor(group.length * qualityProfileForStats.particleFraction)),
        0,
      );

      perfHost.__parallaxCanvasPerf = {
        fps: Number(currentFps.toFixed(1)),
        frameMs: Number(emaFrameMs.toFixed(1)),
        drawMs: Number(emaDrawMs.toFixed(1)),
        particles: visibleParticles,
        quality: effectiveQualityLevel,
        firefox: isFirefox,
        scrolling: isScrollActive,
      };

      if (CANVAS_PERF_DEBUG && perfOverlayRef.current) {
        perfOverlayRef.current.textContent =
          `canvas ${currentFps.toFixed(0)} fps | ${emaDrawMs.toFixed(1)} ms draw | q${effectiveQualityLevel} | ${visibleParticles} p${isScrollActive ? " | scroll" : ""}`;
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

  return (
    <>
      <canvas ref={canvasRef} id="molecule-canvas" />
      {CANVAS_PERF_DEBUG ? (
        <div
          ref={perfOverlayRef}
          style={{
            position: "fixed",
            right: "12px",
            bottom: "12px",
            zIndex: 200,
            padding: "6px 8px",
            borderRadius: "6px",
            background: "rgba(0, 0, 0, 0.72)",
            color: "#fff",
            font: "12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        />
      ) : null}
    </>
  );
}
