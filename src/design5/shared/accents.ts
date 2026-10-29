export interface AccentPreset {
  name: string;
  className: string;
  rgb: string;
  rgbLight: string;
  /** Circuit-board pattern colour (hex, no "#"). Matches the old cyan + hue-rotate filter output. */
  circuit: string;
  /** Circuit-board hero traces colour in light mode (hex, no "#") */
  circuitLight: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: "Cyan",   className: "",              rgb: "34, 211, 238",   rgbLight: "8, 145, 178",   circuit: "22d3ee", circuitLight: "0891b2" },
  { name: "Yellow", className: "accent-yellow", rgb: "245, 225, 43",   rgbLight: "184, 163, 8",   circuit: "f7b000", circuitLight: "a27b00" },
  { name: "Red",    className: "accent-red",    rgb: "221, 68, 68",    rgbLight: "180, 40, 40",   circuit: "ff8882", circuitLight: "eb5848" },
  { name: "Pale",   className: "accent-pale",   rgb: "254, 255, 176",  rgbLight: "180, 160, 20",  circuit: "fff977", circuitLight: "b5ac42" },
  { name: "Green",  className: "accent-green",  rgb: "43, 245, 178",   rgbLight: "16, 150, 100",  circuit: "17df94", circuitLight: "009d6a" },
];
