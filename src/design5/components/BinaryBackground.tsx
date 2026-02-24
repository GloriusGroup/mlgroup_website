import { useEffect, useRef } from "react";

// Deterministic PRNG
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Check if a line segment from (ax,ay)->(bx,by) intersects any exclusion zone
function hitsZone(ax: number, ay: number, bx: number, by: number, zones: Rect[]): boolean {
  for (const z of zones) {
    // Expand zone slightly for padding
    const pad = 4;
    const zx1 = z.x1 - pad;
    const zy1 = z.y1 - pad;
    const zx2 = z.x2 + pad;
    const zy2 = z.y2 + pad;

    // For axis-aligned lines, simple AABB overlap check
    const lx1 = Math.min(ax, bx);
    const ly1 = Math.min(ay, by);
    const lx2 = Math.max(ax, bx);
    const ly2 = Math.max(ay, by);

    if (lx1 <= zx2 && lx2 >= zx1 && ly1 <= zy2 && ly2 >= zy1) {
      return true;
    }
  }
  return false;
}

export function BinaryBackground({
  isDark,
  accentRgb,
}: {
  isDark: boolean;
  accentRgb: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const rand = mulberry32(7);

      // Grid settings
      const cellSize = 40;
      const cols = Math.ceil(w / cellSize) + 2;
      const rows = Math.ceil(h / cellSize) + 2;

      // Light white for dark mode, dark grey for light mode
      const rgb = isDark ? "190, 200, 210" : "40, 60, 80";
      const traceAlpha = isDark ? 0.08 : 0.07;
      const padAlpha = isDark ? 0.12 : 0.1;
      const brightAlpha = isDark ? 0.22 : 0.18;

      ctx.lineCap = "square";
      ctx.lineJoin = "miter";

      // ---- Phase 1: Place nodes, collect IC exclusion zones ----
      type Node = { x: number; y: number; type: "via" | "pad" | "ic" | "none" };
      const nodes: Node[] = [];
      const icZones: Rect[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellSize;
          const y = r * cellSize;
          const v = rand();
          if (v < 0.025) {
            nodes.push({ x, y, type: "pad" });
          } else if (v < 0.045) {
            nodes.push({ x, y, type: "via" });
          } else if (v < 0.05) {
            nodes.push({ x, y, type: "ic" });
            const cw = cellSize * 1.5;
            const ch = cellSize * 2;
            icZones.push({
              x1: x - cw / 2,
              y1: y - ch / 2,
              x2: x + cw / 2,
              y2: y + ch / 2,
            });
          } else {
            nodes.push({ x, y, type: "none" });
          }
        }
      }

      const activeNodes = nodes.filter((n) => n.type !== "none");

      // ---- Phase 2: Draw traces, avoiding IC zones ----
      ctx.lineWidth = 1;

      for (const node of activeNodes) {
        if (node.type === "ic") continue; // ICs don't emit traces
        // Fewer traces per node (1 or 2 max)
        const traceCount = rand() > 0.6 ? 2 : 1;
        for (let t = 0; t < traceCount; t++) {
          const dir = Math.floor(rand() * 4);
          const length = (Math.floor(rand() * 4) + 2) * cellSize;
          const dx = dir === 0 ? 1 : dir === 2 ? -1 : 0;
          const dy = dir === 1 ? 1 : dir === 3 ? -1 : 0;

          const endX = node.x + dx * length;
          const endY = node.y + dy * length;

          const hasBend = rand() > 0.6;

          if (hasBend) {
            const bendAt = (Math.floor(rand() * 3) + 1) * cellSize;
            const midX = node.x + dx * bendAt;
            const midY = node.y + dy * bendAt;
            const perpDx = dx === 0 ? (rand() > 0.5 ? 1 : -1) : 0;
            const perpDy = dy === 0 ? (rand() > 0.5 ? 1 : -1) : 0;
            const perpLen = (Math.floor(rand() * 2) + 1) * cellSize;
            const tipX = midX + perpDx * perpLen;
            const tipY = midY + perpDy * perpLen;

            // Skip if either segment hits an IC
            if (
              hitsZone(node.x, node.y, midX, midY, icZones) ||
              hitsZone(midX, midY, tipX, tipY, icZones)
            )
              continue;

            ctx.strokeStyle = `rgba(${rgb},${traceAlpha})`;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(midX, midY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
          } else {
            if (hitsZone(node.x, node.y, endX, endY, icZones)) continue;

            ctx.strokeStyle = `rgba(${rgb},${traceAlpha})`;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
      }

      // ---- Sparse bus traces ----
      for (let r = 0; r < rows; r++) {
        if (rand() > 0.04) continue; // sparser
        const y = r * cellSize;
        const startC = Math.floor(rand() * (cols * 0.2));
        const endC = startC + Math.floor(rand() * (cols * 0.35)) + 4;
        const sx = startC * cellSize;
        const ex = endC * cellSize;

        if (hitsZone(sx, y, ex, y, icZones)) continue;

        ctx.strokeStyle = `rgba(${rgb},${traceAlpha * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(ex, y);
        ctx.stroke();
      }

      // ---- Phase 3: Draw components (on top, clean) ----

      // Vias and pads
      for (const node of activeNodes) {
        if (node.type === "via") {
          ctx.fillStyle = `rgba(${rgb},${padAlpha})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(${rgb},${traceAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (node.type === "pad") {
          const s = 5;
          ctx.fillStyle = `rgba(${rgb},${padAlpha})`;
          ctx.fillRect(node.x - s, node.y - s, s * 2, s * 2);

          // Drill hole punched out
          ctx.fillStyle = isDark
            ? "rgba(7, 19, 24, 0.8)"
            : "rgba(240, 249, 255, 0.8)";
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ICs — drawn last so nothing overlaps them
      for (const node of activeNodes) {
        if (node.type !== "ic") continue;

        const cw = cellSize * 1.5;
        const ch = cellSize * 2;

        // Clear the area behind the IC first
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(node.x - cw / 2 - 4, node.y - ch / 2 - 4, cw + 8, ch + 8);
        ctx.restore();

        // IC body
        ctx.strokeStyle = `rgba(${rgb},${padAlpha})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(node.x - cw / 2, node.y - ch / 2, cw, ch);

        // Notch
        ctx.beginPath();
        ctx.arc(node.x, node.y - ch / 2, 3, 0, Math.PI);
        ctx.stroke();

        // Pins
        const pinCount = 4;
        const pinSpacing = ch / (pinCount + 1);
        ctx.fillStyle = `rgba(${rgb},${padAlpha})`;
        for (let p = 1; p <= pinCount; p++) {
          const py = node.y - ch / 2 + p * pinSpacing;
          ctx.fillRect(node.x - cw / 2 - 6, py - 2, 6, 4);
          ctx.fillRect(node.x + cw / 2, py - 2, 6, 4);
        }
      }

      // ---- Scattered small SMD components ----
      const compCount = Math.floor((cols * rows) / 120);
      for (let i = 0; i < compCount; i++) {
        const cx = Math.floor(rand() * cols) * cellSize + cellSize / 2;
        const cy = Math.floor(rand() * rows) * cellSize + cellSize / 2;
        const horizontal = rand() > 0.5;
        const compLen = 8;

        // Skip if overlapping an IC
        if (hitsZone(cx - 14, cy - 5, cx + 14, cy + 5, icZones)) continue;

        ctx.strokeStyle = `rgba(${rgb},${traceAlpha})`;
        ctx.lineWidth = 0.8;

        if (horizontal) {
          ctx.beginPath();
          ctx.moveTo(cx - compLen - 5, cy);
          ctx.lineTo(cx - compLen, cy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + compLen, cy);
          ctx.lineTo(cx + compLen + 5, cy);
          ctx.stroke();
          ctx.strokeStyle = `rgba(${rgb},${padAlpha})`;
          ctx.strokeRect(cx - compLen, cy - 3, compLen * 2, 6);
        } else {
          ctx.beginPath();
          ctx.moveTo(cx, cy - compLen - 5);
          ctx.lineTo(cx, cy - compLen);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy + compLen);
          ctx.lineTo(cx, cy + compLen + 5);
          ctx.stroke();
          ctx.strokeStyle = `rgba(${rgb},${padAlpha})`;
          ctx.strokeRect(cx - 3, cy - compLen, 6, compLen * 2);
        }
      }

      // ---- Bright accent dots ----
      for (const node of activeNodes) {
        if (rand() > 0.06) continue;
        ctx.fillStyle = `rgba(${rgb},${brightAlpha})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [isDark, accentRgb]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
