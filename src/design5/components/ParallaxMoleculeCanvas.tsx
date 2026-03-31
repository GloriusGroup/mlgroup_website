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
    scrollSpeed: 0.02, count: 20,
    sizeRange: [1, 2.2], alphaRange: [0.05, 0.12],
    connectionDist: 80, lineWidth: 0.3, drift: 0.04, nodeRatio: 0.1,
  },
  {
    scrollSpeed: 0.2, count: 50,
    sizeRange: [3.5, 6], alphaRange: [0.2, 0.4],
    connectionDist: 170, lineWidth: 0.65, drift: 0.18, nodeRatio: 0.2,
  },
  {
    scrollSpeed: 0.65, count: 60,
    sizeRange: [7.5, 9], alphaRange: [0.35, 0.55],
    connectionDist: 200, lineWidth: 0.8, drift: 0.3, nodeRatio: 0.25,
  },
];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; alpha: number; isNode: boolean;
  layer: number; idx: number; phase: number;
  memberImgIdx: number; renderY: number; hasCross: boolean;
}

interface LayerFrameBuffers {
  x: Float32Array; y: Float32Array;
  bucketCounts: Uint16Array;
  lineBuckets: [Float32Array, Float32Array, Float32Array, Float32Array];
}

const IS_FIREFOX =
  typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);
const CANVAS_PERF_DEBUG =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("canvas_perf") === "1";

// ---------------------------------------------------------------------------
// WebGL point-sprite renderer — renders ALL particles in a single draw call.
// Used on Firefox where Canvas 2D is fundamentally CPU-bound and slow.
// ---------------------------------------------------------------------------
function createGLRenderer(canvas: HTMLCanvasElement, accentRgb: string) {
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: true, desynchronized: true, antialias: false,
  });
  if (!gl) return null;

  const rgb = accentRgb.split(",").map((s) => parseFloat(s.trim()) / 255);

  const vsSrc = `
    attribute vec2 a_pos;
    attribute float a_size;
    attribute float a_alpha;
    uniform vec2 u_res;
    uniform float u_scale;
    varying float v_alpha;
    void main() {
      vec2 c = (a_pos / u_res) * 2.0 - 1.0;
      c.y = -c.y;
      gl_Position = vec4(c, 0.0, 1.0);
      gl_PointSize = a_size * 2.0 * u_scale;
      v_alpha = a_alpha;
    }`;
  const fsSrc = `
    precision mediump float;
    uniform vec3 u_color;
    varying float v_alpha;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float a = v_alpha * smoothstep(0.5, 0.32, d);
      gl_FragColor = vec4(u_color * a, a);
    }`;

  function compile(type: number, src: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const aSize = gl.getAttribLocation(prog, "a_size");
  const aAlpha = gl.getAttribLocation(prog, "a_alpha");
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uScale = gl.getUniformLocation(prog, "u_scale");
  const uColor = gl.getUniformLocation(prog, "u_color");

  const posBuf = gl.createBuffer()!;
  const sizeBuf = gl.createBuffer()!;
  const alphaBuf = gl.createBuffer()!;

  const MAX = 300;
  const posArr = new Float32Array(MAX * 2);
  const sizeArr = new Float32Array(MAX);
  const alphaArr = new Float32Array(MAX);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform3f(uColor, rgb[0]!, rgb[1]!, rgb[2]!);

  let curW = 0, curH = 0;

  return {
    resize(w: number, h: number, scale: number) {
      const cw = Math.max(1, Math.floor(w * scale));
      const ch = Math.max(1, Math.floor(h * scale));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      curW = w; curH = h;
      gl!.viewport(0, 0, cw, ch);
    },
    render(particles: Particle[], w: number, h: number, scale: number) {
      if (curW !== w || curH !== h) this.resize(w, h, scale);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.useProgram(prog);
      gl!.uniform2f(uRes, w, h);
      gl!.uniform1f(uScale, scale);

      const n = Math.min(particles.length, MAX);
      for (let i = 0; i < n; i++) {
        const p = particles[i]!;
        posArr[i * 2] = p.x;
        posArr[i * 2 + 1] = p.renderY;
        sizeArr[i] = p.r;
        alphaArr[i] = p.alpha;
      }

      gl!.bindBuffer(gl!.ARRAY_BUFFER, posBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, posArr.subarray(0, n * 2), gl!.DYNAMIC_DRAW);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);

      gl!.bindBuffer(gl!.ARRAY_BUFFER, sizeBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, sizeArr.subarray(0, n), gl!.DYNAMIC_DRAW);
      gl!.enableVertexAttribArray(aSize);
      gl!.vertexAttribPointer(aSize, 1, gl!.FLOAT, false, 0, 0);

      gl!.bindBuffer(gl!.ARRAY_BUFFER, alphaBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, alphaArr.subarray(0, n), gl!.DYNAMIC_DRAW);
      gl!.enableVertexAttribArray(aAlpha);
      gl!.vertexAttribPointer(aAlpha, 1, gl!.FLOAT, false, 0, 0);

      gl!.drawArrays(gl!.POINTS, 0, n);
    },
    destroy() {
      gl!.deleteProgram(prog);
      gl!.deleteShader(vs);
      gl!.deleteShader(fs);
      gl!.deleteBuffer(posBuf);
      gl!.deleteBuffer(sizeBuf);
      gl!.deleteBuffer(alphaBuf);
    },
  };
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
  const allImgsRef = useRef<HTMLImageElement[]>([]);
  const allImgsLoadedRef = useRef(false);
  const perfOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ALL_MODE) {
      let done = 0;
      const imgs: HTMLImageElement[] = [];
      for (const url of allMemberUrls) {
        const img = new Image();
        img.onload = () => { done++; if (!allImgsLoadedRef.current) { allImgsRef.current = imgs; allImgsLoadedRef.current = true; } };
        img.onerror = () => { done++; };
        img.src = url;
        imgs.push(img);
      }
    } else if (MEMBER_IMG_URL) {
      const img = new Image();
      img.onload = () => { memberImgRef.current = img; memberLoadedRef.current = true; };
      img.src = MEMBER_IMG_URL;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isFirefox = IS_FIREFOX;

    // --- Try WebGL first (all browsers), fall back to Canvas 2D ---
    const glRenderer = createGLRenderer(canvas, accentRgb);
    const useWebGL = !!glRenderer;
    const ctx = useWebGL ? null : canvas.getContext("2d", { desynchronized: true });
    if (!useWebGL && !ctx) return;

    const densityScale = useWebGL ? 1 : 1;
    const renderScale = useWebGL ? 0.75 : 1;

    const scrollOffsets = new Float32Array(LAYERS.length);
    const colorCache = new Map<number, string>();
    const perfHost = window as Window & { __parallaxCanvasPerf?: Record<string, unknown> };
    let lastFrameTime = 0;
    let frameCount = 0;
    let fpsFrameCount = 0;
    let fpsWindowStart = performance.now();
    let currentFps = 0;
    let emaFrameMs = 16.7;
    let emaDrawMs = 8;
    let scrollActiveUntil = 0;
    // Adaptive quality — fraction of particles to render (1.0 = all, 0.3 = minimum)
    let particleFraction = 1.0;
    let adaptCooldown = 0;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let layerBuffers: LayerFrameBuffers[] = [];
    // Pre-allocated spatial hash grid for O(n) physics
    const REPEL_DIST = 30;
    const CELL_CAP = 8;
    let gridCols = 0, gridRows = 0;
    let gridCounts = new Uint8Array(0);
    let gridCells = new Uint16Array(0);
    const reallocGrid = () => {
      gridCols = Math.ceil(viewportWidth / REPEL_DIST) + 3;
      gridRows = Math.ceil((viewportHeight + 160) / REPEL_DIST) + 3;
      const len = gridCols * gridRows;
      gridCounts = new Uint8Array(len);
      gridCells = new Uint16Array(len * CELL_CAP);
    };
    reallocGrid();

    const toRgba = (alpha: number) => {
      const clamped = Math.max(0, Math.min(1, alpha));
      const key = Math.round(clamped * 1000);
      const cached = colorCache.get(key);
      if (cached) return cached;
      const value = `rgba(${accentRgb}, ${(key / 1000).toFixed(3)})`;
      colorCache.set(key, value);
      return value;
    };

    const initParticles = (w: number, h: number) => {
      const particles: Particle[] = [];
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
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * cfg.drift * 2,
            vy: (Math.random() - 0.5) * cfg.drift * 2,
            r: (sMin + Math.random() * (sMax - sMin)) * memberScale,
            alpha: aMin + Math.random() * (aMax - aMin),
            isNode: i < count * cfg.nodeRatio,
            layer: li, idx: i,
            phase: Math.random() * Math.PI * 2,
            memberImgIdx: ALL_MODE ? globalIdx % allMemberUrls.length : 0,
            renderY: 0, hasCross: i % 7 === 0,
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
        const cap = Math.max(4, group.length * (group.length - 1) * 2);
        return {
          x: new Float32Array(group.length), y: new Float32Array(group.length),
          bucketCounts: new Uint16Array(4),
          lineBuckets: [new Float32Array(cap), new Float32Array(cap), new Float32Array(cap), new Float32Array(cap)],
        };
      });
    };

    const resize = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      reallocGrid();
      if (useWebGL) {
        glRenderer!.resize(viewportWidth, viewportHeight, renderScale);
      } else {
        canvas.width = Math.max(1, Math.floor(viewportWidth * renderScale));
        canvas.height = Math.max(1, Math.floor(viewportHeight * renderScale));
        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;
        ctx!.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        ctx!.imageSmoothingEnabled = true;
      }
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
      scrollActiveUntil = now + 140;
      scrollRef.current = nextY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const handleMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleMouseMove);
    const handleMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    document.addEventListener("mouseleave", handleMouseLeave);

    const animate = (timestamp: number) => {
      const now = performance.now();
      const isScrollActive = now < scrollActiveUntil;

      const deltaMs = lastFrameTime === 0 ? 1000 / 60 : Math.min(100, timestamp - lastFrameTime);
      const frameScale = Math.min(2.5, deltaMs / (1000 / 60));
      const damping = Math.pow(0.985, frameScale);
      lastFrameTime = timestamp;
      const drawStart = performance.now();
      frameCount++;
      fpsFrameCount++;

      const w = viewportWidth;
      const h = viewportHeight;
      const particles = particlesRef.current;
      if (layerGroups[0]!.length === 0) rebuildLayerGroups();
      const scrollY = scrollRef.current;
      const mouse = mouseRef.current;
      timeRef.current += 0.006 * frameScale;
      const time = timeRef.current;

      const buf = 80;
      const wrapH = h + buf * 2;
      for (let i = 0; i < LAYERS.length; i++) scrollOffsets[i] = -scrollY * LAYERS[i]!.scrollSpeed;

      const renderedY = (p: Particle) => {
        const raw = p.y + scrollOffsets[p.layer]!;
        return ((raw % wrapH) + wrapH) % wrapH - buf;
      };

      for (let i = 0; i < particles.length; i++) {
        particles[i]!.renderY = renderedY(particles[i]!);
      }

      // --- Physics (spatial-hash grid to avoid O(n²) full scan) ---
      const repelDistSq = REPEL_DIST * REPEL_DIST;

      for (let li = 0; li < LAYERS.length; li++) {
        const group = layerGroups[li]!;
        const activePhysics = Math.max(3, Math.floor(group.length * particleFraction));
        // Clear grid
        gridCounts.fill(0);
        // Insert particles into grid
        for (let i = 0; i < activePhysics; i++) {
          const p = group[i]!;
          const cx = Math.max(0, Math.min(gridCols - 1, ((p.x + REPEL_DIST) / REPEL_DIST) | 0));
          const cy = Math.max(0, Math.min(gridRows - 1, ((p.renderY + 80 + REPEL_DIST) / REPEL_DIST) | 0));
          const ci = cy * gridCols + cx;
          if (gridCounts[ci]! < CELL_CAP) {
            gridCells[ci * CELL_CAP + gridCounts[ci]!] = i;
            gridCounts[ci]!++;
          }
        }
        // Check each particle against its own cell + right/bottom neighbors
        // (avoids double-counting: only check cells with higher or equal index)
        for (let i = 0; i < activePhysics; i++) {
          const pI = group[i]!;
          const cx = Math.max(0, Math.min(gridCols - 1, ((pI.x + REPEL_DIST) / REPEL_DIST) | 0));
          const cy = Math.max(0, Math.min(gridRows - 1, ((pI.renderY + 80 + REPEL_DIST) / REPEL_DIST) | 0));
          // Check 3x3 neighborhood, but only pairs where j > i
          for (let dy = -1; dy <= 1; dy++) {
            const ny = cy + dy;
            if (ny < 0 || ny >= gridRows) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx;
              if (nx < 0 || nx >= gridCols) continue;
              const ni = ny * gridCols + nx;
              const count = gridCounts[ni]!;
              const base = ni * CELL_CAP;
              for (let k = 0; k < count; k++) {
                const j = gridCells[base + k]!;
                if (j <= i) continue; // only process each pair once
                const pJ = group[j]!;
                const ddx = pI.x - pJ.x;
                if (ddx > REPEL_DIST || ddx < -REPEL_DIST) continue;
                const ddy = pI.renderY - pJ.renderY;
                if (ddy > REPEL_DIST || ddy < -REPEL_DIST) continue;
                const ddSq = ddx * ddx + ddy * ddy;
                if (ddSq < repelDistSq && ddSq > 0) {
                  const dd = Math.sqrt(ddSq);
                  const f = ((REPEL_DIST - dd) / REPEL_DIST) * 0.04 * frameScale;
                  const fx = (ddx / dd) * f; const fy = (ddy / dd) * f;
                  pI.vx += fx; pI.vy += fy; pJ.vx -= fx; pJ.vy -= fy;
                }
              }
            }
          }
        }
      }

      const mouseActive = mouse.x > -9000;
      const repelR = MEMBER_MODE ? 250 : 160;
      const repelRSq = repelR * repelR;
      const edgeZone = w * 0.18;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        if (mouseActive) {
          const dx = p.x - mouse.x; const dy = p.renderY - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < repelRSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (repelR - dist) / repelR;
            p.vx += (dx / dist) * force * 0.2 * frameScale;
            p.vy += (dy / dist) * force * 0.2 * frameScale;
          }
        }
        if (edgeZone > 0 && p.renderY - scrollY > -50 && p.renderY - scrollY < h) {
          if (p.x < edgeZone) { const t = 1 - p.x / edgeZone; p.vx += t * t * 0.15 * frameScale; }
          else if (p.x > w - edgeZone) { const t = 1 - (w - p.x) / edgeZone; p.vx -= t * t * 0.15 * frameScale; }
        }
        p.vx += (Math.random() - 0.5) * 0.03 * frameScale;
        p.vy += (Math.random() - 0.5) * 0.03 * frameScale;
        p.vx *= damping; p.vy *= damping;
        p.x += p.vx * frameScale; p.y += p.vy * frameScale;
        if (p.x < -50) p.x += w + 100; if (p.x > w + 50) p.x -= w + 100;
        if (p.y < -buf) p.y += wrapH; if (p.y > h + buf) p.y -= wrapH;
        p.renderY = renderedY(p);
      }

      // =====================================================================
      // RENDER — WebGL path (Firefox) vs Canvas 2D path (Chrome/Edge)
      // =====================================================================
      if (useWebGL) {
        // Single GPU draw call — apply particleFraction per layer
        const visible: Particle[] = [];
        for (let li = 0; li < LAYERS.length; li++) {
          const group = layerGroups[li]!;
          const count = Math.max(3, Math.floor(group.length * particleFraction));
          for (let i = 0; i < count; i++) {
            const p = group[i]!;
            if (p.renderY > -20 && p.renderY < h + 20 && p.x > -20 && p.x < w + 20) {
              visible.push(p);
            }
          }
        }
        glRenderer!.render(visible, w, h, renderScale);
      } else {
        // --- Canvas 2D path (unchanged for Chrome/Edge) ---
        ctx!.clearRect(0, 0, w, h);
        const useSingleImg = MEMBER_IMG_URL && memberLoadedRef.current && memberImgRef.current;
        const useAllImgs = ALL_MODE && allImgsLoadedRef.current && allImgsRef.current.length > 0;

        for (let li = 0; li < LAYERS.length; li++) {
          const cfg = LAYERS[li]!;
          const group = layerGroups[li]!;
          const buffers = layerBuffers[li]!;
          const rpx = buffers.x;
          const rpy = buffers.y;
          const activeCount = Math.max(3, Math.floor(group.length * particleFraction));
          const connDist = cfg.connectionDist;
          const connDistSq = connDist * connDist;
          const avgAlpha = (cfg.alphaRange[0] + cfg.alphaRange[1]) * 0.5;

          for (let i = 0; i < activeCount; i++) {
            rpx[i] = group[i]!.x;
            rpy[i] = group[i]!.renderY;
          }

          // Connection lines
          const bucketCounts = buffers.bucketCounts;
          bucketCounts[0] = 0; bucketCounts[1] = 0; bucketCounts[2] = 0; bucketCounts[3] = 0;
          if (!isScrollActive) {
            for (let i = 0; i < activeCount; i++) {
              const ax = rpx[i]!; const ay = rpy[i]!;
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
                  const lb = buffers.lineBuckets[bucket]!;
                  const off = bucketCounts[bucket]! * 4;
                  lb[off] = ax; lb[off + 1] = ay; lb[off + 2] = rpx[j]!; lb[off + 3] = rpy[j]!;
                  bucketCounts[bucket]!++;
                }
              }
            }
          }

          ctx!.lineWidth = cfg.lineWidth;
          for (let b = 0; b < 4; b++) {
            const lc = bucketCounts[b]!;
            if (lc === 0) continue;
            const lines = buffers.lineBuckets[b]!;
            ctx!.strokeStyle = toRgba((b + 0.5) / 4 * avgAlpha);
            ctx!.beginPath();
            for (let k = 0; k < lc * 4; k += 4) {
              ctx!.moveTo(lines[k]!, lines[k + 1]!);
              ctx!.lineTo(lines[k + 2]!, lines[k + 3]!);
            }
            ctx!.stroke();
          }

          // Particles
          if (!useSingleImg && !useAllImgs) {
            for (let i = 0; i < activeCount; i++) {
              const p = group[i]!;
              const px = rpx[i]!; const py = rpy[i]!;
              if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;
              const breathe = Math.sin(time * 1.8 + p.phase) * 0.05;
              const a = Math.max(0, p.alpha + breathe);

              ctx!.fillStyle = toRgba(a);
              ctx!.beginPath();
              ctx!.arc(px, py, p.r, 0, Math.PI * 2);
              ctx!.fill();

              if (p.isNode) {
                ctx!.beginPath();
                ctx!.arc(px, py, p.r + 5, 0, Math.PI * 2);
                ctx!.strokeStyle = toRgba(a * 0.3);
                ctx!.lineWidth = 0.5;
                ctx!.stroke();
              }
              if (p.hasCross) {
                ctx!.beginPath();
                ctx!.moveTo(px - 6, py); ctx!.lineTo(px + 6, py);
                ctx!.moveTo(px, py - 6); ctx!.lineTo(px, py + 6);
                ctx!.strokeStyle = toRgba(a * 0.4);
                ctx!.lineWidth = 0.5;
                ctx!.stroke();
              }
            }
          } else {
            for (let i = 0; i < activeCount; i++) {
              const p = group[i]!;
              const px = rpx[i]!; const py = rpy[i]!;
              if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;
              const breathe = Math.sin(time * 1.8 + p.phase) * 0.05;
              const a = Math.max(0, p.alpha + breathe);
              const img = useAllImgs ? allImgsRef.current[p.memberImgIdx] : memberImgRef.current!;
              if (!img || !img.complete || img.naturalWidth === 0) {
                ctx!.beginPath(); ctx!.arc(px, py, p.r * 0.4, 0, Math.PI * 2);
                ctx!.fillStyle = toRgba(a); ctx!.fill(); continue;
              }
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2; const sy = (img.height - minDim) / 2;
              const size = p.r * 2;
              ctx!.save();
              ctx!.globalAlpha = a * 1.8;
              ctx!.beginPath(); ctx!.arc(px, py, p.r, 0, Math.PI * 2); ctx!.clip();
              ctx!.drawImage(img, sx, sy, minDim, minDim, px - p.r, py - p.r, size, size);
              ctx!.restore();
              ctx!.beginPath(); ctx!.arc(px, py, p.r + 2, 0, Math.PI * 2);
              ctx!.strokeStyle = toRgba(a * 0.6); ctx!.lineWidth = 0.5; ctx!.stroke();
            }
          }
        }
      }

      // --- Stats & adaptive quality ---
      const drawMs = performance.now() - drawStart;
      emaFrameMs = emaFrameMs * 0.92 + deltaMs * 0.08;
      emaDrawMs = emaDrawMs * 0.92 + drawMs * 0.08;
      if (timestamp - fpsWindowStart >= 1000) {
        currentFps = (fpsFrameCount * 1000) / (timestamp - fpsWindowStart);
        fpsFrameCount = 0; fpsWindowStart = timestamp;

        // Adapt particle count based on sustained FPS
        if (adaptCooldown > 0) { adaptCooldown--; }
        else if (currentFps < 28 && particleFraction > 0.3) {
          particleFraction = Math.max(0.3, particleFraction - 0.15);
          adaptCooldown = 3; // wait 3s before next change
        } else if (currentFps > 50 && particleFraction < 1.0) {
          particleFraction = Math.min(1.0, particleFraction + 0.1);
          adaptCooldown = 2;
        }
      }

      perfHost.__parallaxCanvasPerf = {
        fps: Number(currentFps.toFixed(1)),
        frameMs: Number(emaFrameMs.toFixed(1)),
        drawMs: Number(emaDrawMs.toFixed(1)),
        particles: particles.length, quality: particleFraction,
        webgl: useWebGL,
        firefox: isFirefox,
        scrolling: isScrollActive,
      };

      if (CANVAS_PERF_DEBUG && perfOverlayRef.current) {
        perfOverlayRef.current.textContent =
          `${useWebGL ? "webgl" : "2d"} ${currentFps.toFixed(0)} fps | ${emaDrawMs.toFixed(1)} ms draw | q${(particleFraction * 100).toFixed(0)}% | ${particles.length} p${isScrollActive ? " | scroll" : ""}`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(animationRef.current);
      else { lastFrameTime = 0; animationRef.current = requestAnimationFrame(animate); }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (glRenderer) glRenderer.destroy();
    };
  }, [isDark, accentRgb]);

  return (
    <>
      <canvas ref={canvasRef} id="molecule-canvas" />
      {CANVAS_PERF_DEBUG ? (
        <div
          ref={perfOverlayRef}
          style={{
            position: "fixed", right: "12px", bottom: "12px", zIndex: 200,
            padding: "6px 8px", borderRadius: "6px",
            background: "rgba(0, 0, 0, 0.72)", color: "#fff",
            font: "12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
            pointerEvents: "none", whiteSpace: "nowrap",
          }}
        />
      ) : null}
    </>
  );
}
