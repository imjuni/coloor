import Color from "colorjs.io";

export type ColorMode = "oklch" | "lch";
export type Gamut = "srgb" | "p3" | "rec2020";
export interface PickerColor {
  mode: ColorMode;
  l: number;
  c: number;
  h: number;
  alpha: number;
}
export type Channel = "l" | "c" | "h" | "alpha";
export const DEFAULT_COLOR: PickerColor = { alpha: 1, c: 0.15, h: 240, l: 0.7, mode: "oklch" };
export const FORMATS = {
  auto: "자동 HEX / RGB",
  figma: "Figma P3",
  hex: "HEX",
  hsl: "HSL",
  lab: "Lab",
  lch: "LCH",
  linear: "Linear RGB",
  numbers: "채널 값",
  oklab: "OKLab",
  oklch: "OKLCH",
  p3: "Display P3",
  rec2020: "Rec.2020",
  rgb: "RGB",
} as const;
export type OutputFormat = keyof typeof FORMATS;
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
export const round = (value: number, digits = 5): string =>
  Number(value.toFixed(digits)).toString();
export const lightnessMax = (mode: ColorMode): number => (mode === "oklch" ? 1 : 100);
export const chromaMax = (mode: ColorMode, wide = false): number => {
  if (mode === "oklch") {
    return wide ? 0.5 : 0.4;
  }
  return wide ? 200 : 150;
};
export const toColor = (value: PickerColor): Color =>
  new Color(value.mode, [value.l, value.c, value.h], value.alpha);
const finite = (value: number | null): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export const fromColor = (color: Color, mode: ColorMode): PickerColor => {
  const converted = color.to(mode);
  return {
    alpha: clamp(finite(color.alpha), 0, 1),
    c: Math.max(0, finite(converted.coords[1])),
    h: ((finite(converted.coords[2]) % 360) + 360) % 360,
    l: clamp(finite(converted.coords[0]), 0, lightnessMax(mode)),
    mode,
  };
};
export const changeMode = (value: PickerColor, mode: ColorMode): PickerColor =>
  mode === value.mode ? value : fromColor(toColor(value), mode);
export const patchColor = (value: PickerColor, patch: Partial<PickerColor>): PickerColor => {
  const next = { ...value, ...patch };
  return {
    ...next,
    alpha: clamp(next.alpha, 0, 1),
    c: clamp(next.c, 0, next.mode === "oklch" ? 1 : 400),
    h: clamp(next.h, 0, 360),
    l: clamp(next.l, 0, lightnessMax(next.mode)),
  };
};
export const parseColor = (text: string, mode: ColorMode, figma = false): PickerColor | null => {
  let input = text
    .trim()
    .replace(/^[\w-]+\s*:\s*/u, "")
    .replace(/;\s*$/u, "");
  if (/^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.test(input)) {
    input = `#${input}`;
  }
  if (/^[\d.]+(?:\s*,\s*|\s+)[\d.]+(?:\s*,\s*|\s+)[\d.]+(?:\s*[,/]\s*[\d.%]+)?$/u.test(input)) {
    const parts = input.split(/[\s,/]+/u);
    input = `${mode}(${parts.slice(0, 3).join(" ")}${parts[3] ? ` / ${parts[3]}` : ""})`;
  }
  try {
    let color = new Color(input);
    if (figma && color.spaceId === "srgb") {
      color = new Color("p3", color.coords, color.alpha);
    }
    if (color.coords.some((channel) => channel !== null && !Number.isFinite(channel))) {
      return null;
    }
    return fromColor(color, mode);
  } catch {
    return null;
  }
};
export const gamutOf = (value: PickerColor): Gamut | "out" => {
  const color = toColor(value);
  for (const space of ["srgb", "p3", "rec2020"] as const) {
    if (color.inGamut(space, { epsilon: 0.00001 })) {
      return space;
    }
  }
  return "out";
};
export const fallbackColor = (value: PickerColor, space: Gamut = "srgb"): Color =>
  toColor(value).to(space).toGamut({ method: "css", space });
export const nativeCode = (value: PickerColor): string =>
  `${value.mode}(${round(value.l)} ${round(value.c)} ${round(value.h)}${value.alpha < 1 ? ` / ${round(value.alpha)}` : ""})`;
export const formatColor = (value: PickerColor, format: OutputFormat): string => {
  const source = toColor(value);
  const rgb = fallbackColor(value);
  if (format === "numbers") {
    return [value.l, value.c, value.h, value.alpha].map((v) => round(v)).join(", ");
  }
  if (format === "figma") {
    const mapped = fallbackColor(value, "p3");
    return new Color("srgb", mapped.coords, mapped.alpha).toString({
      collapse: false,
      format: "hex",
    });
  }
  if (format === "linear") {
    return `color(srgb-linear ${source
      .to("srgb-linear")
      .coords.map((v) => round(finite(v)))
      .join(" ")}${value.alpha < 1 ? ` / ${round(value.alpha)}` : ""})`;
  }
  if (format === "hex" || (format === "auto" && value.alpha === 1)) {
    return rgb.toString({ collapse: false, format: "hex" });
  }
  if (format === "rgb" || format === "auto") {
    const channels = rgb.coords.map((v) => Math.round(finite(v) * 255)).join(" ");
    return `rgb(${channels}${value.alpha < 1 ? ` / ${round(value.alpha)}` : ""})`;
  }
  if (format === "hsl") {
    return rgb.to("hsl").toString({ precision: 6 });
  }
  return source.to(format).toString({ inGamut: false, precision: 6 });
};

// Keep the legacy hash serializer while shared links migrate to query parameters.
export const colorHash = (value: PickerColor): string =>
  `#${[value.l / lightnessMax(value.mode), value.c, value.h, value.alpha * 100].map((v) => round(v, 8)).join(",")}`;
export const colorQuery = (value: PickerColor): string =>
  [value.l / lightnessMax(value.mode), value.c, value.h, value.alpha * 100]
    .map((channel) => round(channel, 8))
    .join(",");
export const colorFromUrl = (url: URL): PickerColor | null => {
  const mode = url.searchParams.get("space") === "lch" ? "lch" : "oklch";
  const raw = (url.searchParams.get("color") ?? url.hash.slice(1)).split(",");
  if (raw.length !== 4 || raw.some((v) => !v.trim() || !Number.isFinite(Number(v)))) {
    return null;
  }
  const [l, c, h, a] = raw.map(Number) as [number, number, number, number];
  if (
    l < 0 ||
    l > 1 ||
    c < 0 ||
    c > (mode === "oklch" ? 1 : 400) ||
    h < 0 ||
    h > 360 ||
    a < 0 ||
    a > 100
  ) {
    return null;
  }
  return { alpha: a / 100, c, h, l: l * lightnessMax(mode), mode };
};

// Parse arithmetic only; never execute user input as JavaScript.
export const calculateChannel = (input: string): number | null => {
  const text = input.replaceAll(/\s+/gu, "");
  if (!text || text.length > 80 || /[^\d.+*/()-]/u.test(text)) {
    return null;
  }
  let index = 0;
  const factor = (): number => {
    if (text[index] === "+" || text[index] === "-") {
      const sign = text[index];
      index += 1;
      return factor() * (sign === "-" ? -1 : 1);
    }
    if (text[index] === "(") {
      index += 1;
      // Parentheses recurse into the complete expression grammar.
      // oxlint-disable-next-line no-use-before-define
      const result = sum();
      if (text[index] !== ")") {
        return Number.NaN;
      }
      index += 1;
      return result;
    }
    const number = /^(?:\d+\.?\d*|\.\d+)/u.exec(text.slice(index));
    if (!number) {
      return Number.NaN;
    }
    index += number[0].length;
    return Number(number[0]);
  };
  const product = (): number => {
    let result = factor();
    while (text[index] === "*" || text[index] === "/") {
      const op = text[index];
      index += 1;
      const next = factor();
      result = op === "*" ? result * next : result / next;
    }
    return result;
  };
  const sum = (): number => {
    let result = product();
    while (text[index] === "+" || text[index] === "-") {
      const op = text[index];
      index += 1;
      const next = product();
      result = op === "+" ? result + next : result - next;
    }
    return result;
  };
  const value = sum();
  return index === text.length && Number.isFinite(value) ? value : null;
};

export interface ColorHistory {
  past: PickerColor[];
  present: PickerColor;
  future: PickerColor[];
}
export type HistoryAction =
  | { type: "set"; value: PickerColor }
  | { type: "undo" }
  | { type: "redo" };
export const historyReducer = (state: ColorHistory, action: HistoryAction): ColorHistory => {
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous
      ? {
          future: [state.present, ...state.future],
          past: state.past.slice(0, -1),
          present: previous,
        }
      : state;
  }
  if (action.type === "redo") {
    const [next] = state.future;
    return next
      ? { future: state.future.slice(1), past: [...state.past, state.present], present: next }
      : state;
  }
  if (JSON.stringify(state.present) === JSON.stringify(action.value)) {
    return state;
  }
  return { future: [], past: [...state.past.slice(-99), state.present], present: action.value };
};
