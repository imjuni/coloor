import type Color from "colorjs.io";

export const toHex = (color: Color): string =>
  color.to("srgb").toString({ collapse: false, format: "hex" }).toUpperCase();

export const adjustLightness = (color: Color, ratio: number): Color => {
  const result = color.clone().to("hsl");
  result.coords[2] = Math.min(100, Math.max(0, (result.coords[2] ?? 0) * (1 + ratio)));
  return result;
};

export const withAlpha = (color: Color, alpha: number): Color => {
  const result = color.clone();
  result.alpha = alpha;
  return result;
};

export const toRgbChannels = (color: Color): number[] =>
  color.to("srgb").coords.map((channel) => Math.round((channel ?? 0) * 255));
