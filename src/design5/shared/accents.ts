export interface AccentPreset {
  name: string;
  className: string;
  rgb: string;
  rgbLight: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: "Cyan",   className: "",              rgb: "34, 211, 238",   rgbLight: "8, 145, 178" },
  { name: "Yellow", className: "accent-yellow", rgb: "245, 225, 43",   rgbLight: "184, 163, 8" },
  { name: "Red",    className: "accent-red",    rgb: "221, 68, 68",    rgbLight: "180, 40, 40" },
  { name: "Pale",   className: "accent-pale",   rgb: "254, 255, 176",  rgbLight: "180, 160, 20" },
  { name: "Green",  className: "accent-green",  rgb: "43, 245, 178",   rgbLight: "16, 150, 100" },
];
