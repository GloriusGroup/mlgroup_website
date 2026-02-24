import { useEffect, useRef, useState, createElement } from "react";
import { Circuit } from "@tscircuit/core";
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg";

// ---------------------------------------------------------------------------
// Build the circuit SVG synchronously using the programmatic API
// ---------------------------------------------------------------------------
function buildCircuitSvg(isDark: boolean): string {
  const circuit = new Circuit();

  circuit.add(
    createElement(
      "board",
      { width: "200mm", height: "140mm" },

      // Row 1 — mixed passives
      createElement("resistor", { name: "R1", resistance: "10k", footprint: "0805", pcbX: "-70mm", pcbY: "-50mm" }),
      createElement("resistor", { name: "R2", resistance: "4.7k", footprint: "0603", pcbX: "-50mm", pcbY: "-50mm" }),
      createElement("capacitor", { name: "C1", capacitance: "100nF", footprint: "0805", pcbX: "-30mm", pcbY: "-50mm" }),
      createElement("resistor", { name: "R3", resistance: "1k", footprint: "0402", pcbX: "-10mm", pcbY: "-50mm" }),
      createElement("capacitor", { name: "C2", capacitance: "10uF", footprint: "1206", pcbX: "10mm", pcbY: "-50mm" }),
      createElement("resistor", { name: "R4", resistance: "220", footprint: "0805", pcbX: "30mm", pcbY: "-50mm" }),
      createElement("led", { name: "LED1", footprint: "0603", pcbX: "50mm", pcbY: "-50mm" }),
      createElement("resistor", { name: "R5", resistance: "100k", footprint: "0603", pcbX: "70mm", pcbY: "-50mm" }),

      // Row 2 — ICs and connections
      createElement("chip", {
        name: "U1",
        footprint: "soic8",
        pcbX: "-55mm",
        pcbY: "-20mm",
        pinLabels: { pin1: ["VCC"], pin2: ["IN_P"], pin3: ["IN_N"], pin4: ["GND"], pin5: ["OUT1"], pin6: ["OUT2"], pin7: ["FB"], pin8: ["EN"] },
      }),
      createElement("capacitor", { name: "C3", capacitance: "1uF", footprint: "0402", pcbX: "-30mm", pcbY: "-20mm" }),
      createElement("resistor", { name: "R6", resistance: "47k", footprint: "0603", pcbX: "-15mm", pcbY: "-20mm" }),
      createElement("chip", {
        name: "U2",
        footprint: "soic8",
        pcbX: "15mm",
        pcbY: "-20mm",
        pinLabels: { pin1: ["SDA"], pin2: ["SCL"], pin3: ["A0"], pin4: ["GND"], pin5: ["VCC"], pin6: ["WP"], pin7: ["NC1"], pin8: ["NC2"] },
      }),
      createElement("capacitor", { name: "C4", capacitance: "100nF", footprint: "0402", pcbX: "40mm", pcbY: "-20mm" }),
      createElement("diode", { name: "D1", footprint: "0603", pcbX: "60mm", pcbY: "-20mm" }),

      // Row 3
      createElement("resistor", { name: "R7", resistance: "330", footprint: "0805", pcbX: "-65mm", pcbY: "10mm" }),
      createElement("led", { name: "LED2", footprint: "0805", pcbX: "-45mm", pcbY: "10mm" }),
      createElement("capacitor", { name: "C5", capacitance: "22pF", footprint: "0402", pcbX: "-25mm", pcbY: "10mm" }),
      createElement("capacitor", { name: "C6", capacitance: "22pF", footprint: "0402", pcbX: "-5mm", pcbY: "10mm" }),
      createElement("chip", {
        name: "U3",
        footprint: "soic8",
        pcbX: "25mm",
        pcbY: "10mm",
        pinLabels: { pin1: ["D0"], pin2: ["D1"], pin3: ["CLK"], pin4: ["GND"], pin5: ["VCC"], pin6: ["CS"], pin7: ["MOSI"], pin8: ["MISO"] },
      }),
      createElement("resistor", { name: "R8", resistance: "10k", footprint: "0603", pcbX: "55mm", pcbY: "10mm" }),
      createElement("resistor", { name: "R9", resistance: "10k", footprint: "0603", pcbX: "70mm", pcbY: "10mm" }),

      // Row 4
      createElement("capacitor", { name: "C7", capacitance: "4.7uF", footprint: "0805", pcbX: "-60mm", pcbY: "40mm" }),
      createElement("resistor", { name: "R10", resistance: "2.2k", footprint: "0603", pcbX: "-40mm", pcbY: "40mm" }),
      createElement("diode", { name: "D2", footprint: "0805", pcbX: "-20mm", pcbY: "40mm" }),
      createElement("resistor", { name: "R11", resistance: "560", footprint: "0402", pcbX: "0mm", pcbY: "40mm" }),
      createElement("led", { name: "LED3", footprint: "0603", pcbX: "20mm", pcbY: "40mm" }),
      createElement("capacitor", { name: "C8", capacitance: "47nF", footprint: "0603", pcbX: "40mm", pcbY: "40mm" }),
      createElement("resistor", { name: "R12", resistance: "75", footprint: "0805", pcbX: "60mm", pcbY: "40mm" }),

      // Traces
      createElement("trace", { path: [".R1 > .right", ".R2 > .left"] }),
      createElement("trace", { path: [".R2 > .right", ".C1 > .pin1"] }),
      createElement("trace", { path: [".C1 > .pin2", ".R3 > .left"] }),
      createElement("trace", { path: [".R3 > .right", ".C2 > .pin1"] }),
      createElement("trace", { path: [".C2 > .pin2", ".R4 > .left"] }),
      createElement("trace", { path: [".R4 > .right", ".LED1 > .anode"] }),
      createElement("trace", { path: [".LED1 > .cathode", ".R5 > .left"] }),
      createElement("trace", { path: [".U1 > .OUT1", ".C3 > .pin1"] }),
      createElement("trace", { path: [".C3 > .pin2", ".R6 > .left"] }),
      createElement("trace", { path: [".R6 > .right", ".U2 > .SDA"] }),
      createElement("trace", { path: [".U2 > .VCC", ".C4 > .pin1"] }),
      createElement("trace", { path: [".C4 > .pin2", ".D1 > .anode"] }),
      createElement("trace", { path: [".R7 > .right", ".LED2 > .anode"] }),
      createElement("trace", { path: [".LED2 > .cathode", ".C5 > .pin1"] }),
      createElement("trace", { path: [".C5 > .pin2", ".C6 > .pin1"] }),
      createElement("trace", { path: [".U3 > .MISO", ".R8 > .left"] }),
      createElement("trace", { path: [".R8 > .right", ".R9 > .left"] }),
      createElement("trace", { path: [".C7 > .pin2", ".R10 > .left"] }),
      createElement("trace", { path: [".R10 > .right", ".D2 > .anode"] }),
      createElement("trace", { path: [".D2 > .cathode", ".R11 > .left"] }),
      createElement("trace", { path: [".R11 > .right", ".LED3 > .anode"] }),
      createElement("trace", { path: [".LED3 > .cathode", ".C8 > .pin1"] }),
      createElement("trace", { path: [".C8 > .pin2", ".R12 > .left"] }),
    )
  );

  circuit.render();
  const json = circuit.getCircuitJson();

  return convertCircuitJsonToPcbSvg(json, {
    backgroundColor: "transparent",
    width: 1200,
    height: 840,
    colorOverrides: isDark
      ? {
          copper: { top: "rgba(190,200,210,0.15)", bottom: "rgba(190,200,210,0.08)" },
          silkscreen: { top: "rgba(190,200,210,0.12)", bottom: "rgba(190,200,210,0.06)" },
          drill: "rgba(190,200,210,0.1)",
          soldermask: { top: "rgba(190,200,210,0.03)", bottom: "rgba(190,200,210,0.02)" },
          boardOutline: "rgba(190,200,210,0.06)",
          substrate: "transparent",
        }
      : {
          copper: { top: "rgba(40,60,80,0.12)", bottom: "rgba(40,60,80,0.06)" },
          silkscreen: { top: "rgba(40,60,80,0.1)", bottom: "rgba(40,60,80,0.05)" },
          drill: "rgba(40,60,80,0.08)",
          soldermask: { top: "rgba(40,60,80,0.03)", bottom: "rgba(40,60,80,0.02)" },
          boardOutline: "rgba(40,60,80,0.05)",
          substrate: "transparent",
        },
  });
}

// ---------------------------------------------------------------------------
// Component: tiled parallax circuit background
// ---------------------------------------------------------------------------
export function CircuitBackground({
  isDark,
}: {
  isDark: boolean;
  accentRgb: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const rafRef = useRef(0);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // Generate the SVG (runs once per theme change)
  useEffect(() => {
    try {
      const svg = buildCircuitSvg(isDark);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      setSvgUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      console.error("CircuitBackground: failed to render circuit", e);
    }
  }, [isDark]);

  // Parallax scroll
  useEffect(() => {
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const animate = () => {
      if (containerRef.current) {
        const offset = -scrollRef.current * 0.15;
        containerRef.current.style.transform = `translateY(${offset}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!svgUrl) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: "-20vh",
        left: 0,
        width: "100vw",
        height: "140vh",
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage: `url("${svgUrl}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "900px auto",
        willChange: "transform",
      }}
    />
  );
}
