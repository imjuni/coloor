import { chromaMax, lightnessMax, toColor } from "./oklch.ts";
import type { ColorMode, Gamut, PickerColor } from "./oklch.ts";

export type Plane = "l" | "c" | "h";
export const planeColor = (
  value: PickerColor,
  plane: Plane,
  x: number,
  y: number,
  maxChroma: number,
): PickerColor => {
  const next = { ...value, alpha: 1 };
  if (plane === "l") {
    next.h = x * 360;
    next.c = y * maxChroma;
  }
  if (plane === "c") {
    next.h = x * 360;
    next.l = y * lightnessMax(value.mode);
  }
  if (plane === "h") {
    next.l = x * lightnessMax(value.mode);
    next.c = y * maxChroma;
  }
  return next;
};
export const planePosition = (
  value: PickerColor,
  plane: Plane,
  maxChroma: number,
): [number, number] => [
  plane === "h" ? value.l / lightnessMax(value.mode) : value.h / 360,
  plane === "c" ? value.l / lightnessMax(value.mode) : value.c / maxChroma,
];
export const boundaryChroma = (mode: ColorMode, gamut: Gamut, l: number, h: number): number => {
  let low = 0;
  let high = chromaMax(mode, true) * 1.25;
  for (let i = 0; i < 16; i += 1) {
    const c = (low + high) / 2;
    if (toColor({ alpha: 1, c, h, l, mode }).inGamut(gamut, { epsilon: 0.000001 })) {
      low = c;
    } else {
      high = c;
    }
  }
  return low;
};
export interface Vertex {
  x: number;
  y: number;
  z: number;
  color: string;
}
export interface Mesh {
  colors: Float32Array;
  indices: Uint32Array;
  positions: Float32Array;
  gamut: Gamut;
}
export const colorVertex = (value: PickerColor): Vertex => {
  const radius = value.c / chromaMax(value.mode, true);
  const angle = (value.h * Math.PI) / 180;
  const rgb = toColor(value).to("srgb");
  const channels = rgb.coords.map((v) => Math.round(Math.max(0, Math.min(1, v ?? 0)) * 255));
  return {
    color: `rgb(${channels.join(" ")})`,
    x: radius * Math.cos(angle),
    y: value.l / lightnessMax(value.mode) - 0.5,
    z: radius * Math.sin(angle),
  };
};
export const makeGamutMesh = (mode: ColorMode, gamut: Gamut): Mesh => {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const lightnessSteps = 100;
  const hueSteps = 180;
  for (let row = 0; row <= lightnessSteps; row += 1) {
    const l = (row / lightnessSteps) * lightnessMax(mode);
    for (let column = 0; column <= hueSteps; column += 1) {
      const h = (column / hueSteps) * 360;
      const c = boundaryChroma(mode, gamut, l, h);
      const channels = toColor({ alpha: 1, c, h, l, mode }).to(gamut).coords;
      positions.push(
        l / lightnessMax(mode) - 0.5,
        c / (chromaMax(mode, true) * 2) - 0.25,
        h / 360 - 0.5,
      );
      colors.push(...channels.map((channel) => Math.max(0, Math.min(1, channel ?? 0))));
      if (row < lightnessSteps && column < hueSteps) {
        const current = row * (hueSteps + 1) + column;
        const next = current + hueSteps + 1;
        indices.push(current, next, current + 1, current + 1, next, next + 1);
      }
    }
  }
  return {
    colors: new Float32Array(colors),
    gamut,
    indices: new Uint32Array(indices),
    positions: new Float32Array(positions),
  };
};
