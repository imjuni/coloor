export interface RgbColor {
  b: number;
  g: number;
  r: number;
}

const HEX_PATTERN = /^(?:#)?([\da-f]{3}|[\da-f]{6})$/iu;

export const normalizeHex = (value: string): string | null => {
  const match = HEX_PATTERN.exec(value.trim());
  if (!match?.[1]) {
    return null;
  }
  const hex =
    match[1].length === 3 ? [...match[1]].map((part) => part.repeat(2)).join("") : match[1];
  return `#${hex.toUpperCase()}`;
};

export const hexToRgb = (value: string): RgbColor | null => {
  const normalized = normalizeHex(value);
  if (!normalized) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

export const composite = (foreground: RgbColor, background: RgbColor, alpha: number): RgbColor => {
  const boundedAlpha = Math.min(1, Math.max(0, alpha));
  return {
    r: foreground.r * boundedAlpha + background.r * (1 - boundedAlpha),
    g: foreground.g * boundedAlpha + background.g * (1 - boundedAlpha),
    b: foreground.b * boundedAlpha + background.b * (1 - boundedAlpha),
  };
};

const linearChannel = (channel: number): number => {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (color: RgbColor): number =>
  0.2126 * linearChannel(color.r) +
  0.7152 * linearChannel(color.g) +
  0.0722 * linearChannel(color.b);

export const contrastRatio = (foreground: RgbColor, background: RgbColor, alpha = 1): number => {
  const renderedForeground = composite(foreground, background, alpha);
  const foregroundLuminance = relativeLuminance(renderedForeground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};
