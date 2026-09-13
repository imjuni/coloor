import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateChannel,
  changeMode,
  colorFromUrl,
  colorHash,
  DEFAULT_COLOR,
  fallbackColor,
  formatColor,
  FORMATS,
  gamutOf,
  historyReducer,
  nativeCode,
  parseColor,
  toColor,
} from "../src/utils/oklch.ts";
import { boundaryChroma, planeColor, planePosition } from "../src/utils/gamut.ts";

const close = (actual, expected, epsilon = 0.0001) =>
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} should be close to ${expected}`);

test("converts sRGB primaries without changing their hexadecimal values", () => {
  for (const hex of [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#00ffff",
    "#ff00ff",
    "#ffff00",
    "#010101",
    "#fefefe",
  ]) {
    const value = parseColor(hex, "oklch");
    assert.ok(value);
    assert.equal(formatColor(value, "hex"), hex);
    assert.equal(gamutOf(value), "srgb");
  }
});
test("preserves alpha through HEX and both cylindrical spaces", () => {
  const value = parseColor("#ff000080", "oklch");
  assert.ok(value);
  close(value.alpha, 128 / 255);
  const converted = changeMode(value, "lch");
  assert.equal(formatColor(converted, "hex"), "#ff000080");
  assert.equal(formatColor(changeMode(converted, "oklch"), "hex"), "#ff000080");
});
test("converts known red coordinates accurately", () => {
  const value = parseColor("red", "oklch");
  assert.ok(value);
  close(value.l, 0.627955);
  close(value.c, 0.257683);
  close(value.h, 29.233885);
});
test("accepts CSS declarations, bare hex, tuples, and modern CSS colors", () => {
  for (const input of ["color: #ff0000;", "ff0000", "rgb(255 0 0)", "hsl(0 100% 50%)"]) {
    assert.equal(formatColor(parseColor(input, "oklch"), "hex"), "#ff0000");
  }
  for (const input of ["0.7, 0.15, 240", "oklch(70% 0.15 240)", "color(display-p3 0.2 0.5 0.8)"]) {
    assert.ok(parseColor(input, "oklch"));
  }
});
test("rejects invalid input without producing nonfinite coordinates", () => {
  for (const input of ["", "#gggggg", "not-a-color", "oklch(NaN 0 0)", "rgb(1 2)", "alert(1)"]) {
    assert.equal(parseColor(input, "oklch"), null);
  }
});
test("keeps achromatic colors and transparent black finite", () => {
  for (const input of ["white", "black", "gray", "transparent"]) {
    const value = parseColor(input, "oklch");
    assert.ok(value);
    for (const channel of [value.l, value.c, value.h, value.alpha]) {
      assert.ok(Number.isFinite(channel));
    }
    assert.ok(!nativeCode(value).includes("NaN"));
  }
  assert.equal(parseColor("transparent", "oklch").alpha, 0);
});
test("classifies nested gamut boundaries and maps a fallback without mutation", () => {
  const p3 = parseColor("color(display-p3 1 0 0)", "oklch");
  const rec = parseColor("color(rec2020 0 1 0)", "oklch");
  assert.equal(gamutOf(p3), "p3");
  assert.equal(gamutOf(rec), "rec2020");
  const outside = { ...DEFAULT_COLOR, c: 0.8 };
  assert.equal(gamutOf(outside), "out");
  const before = { ...outside };
  assert.ok(fallbackColor(outside).inGamut("srgb"));
  assert.deepEqual(outside, before);
});
test("produces finite output for every supported format", () => {
  for (const format of Object.keys(FORMATS)) {
    const output = formatColor({ ...DEFAULT_COLOR, alpha: 0.5 }, format);
    assert.ok(output.length > 0);
    assert.ok(!/NaN|Infinity|undefined/u.test(output), format);
    if (!["numbers", "figma"].includes(format)) {
      assert.ok(parseColor(output, "oklch"), output);
    }
  }
});
test("interprets Figma hex in Display P3 rather than sRGB", () => {
  const figma = parseColor("#ff0000", "oklch", true);
  assert.equal(gamutOf(figma), "p3");
  assert.equal(formatColor(figma, "figma"), "#ff0000");
});
test("restores shared URLs in both modes including normalized legacy LCH", () => {
  for (const value of [DEFAULT_COLOR, changeMode({ ...DEFAULT_COLOR, alpha: 0.3 }, "lch")]) {
    const restored = colorFromUrl(
      new URL(`https://example.test/coloor/oklch/?space=${value.mode}${colorHash(value)}`),
    );
    assert.ok(restored);
    close(restored.l, value.l);
    close(restored.c, value.c);
    close(restored.alpha, value.alpha);
    assert.equal(restored.mode, value.mode);
  }
  assert.equal(colorFromUrl(new URL("https://example.test/?space=lch#0.5,40,200,100")).l, 50);
});
test("rejects malformed and out-of-range shared colors", () => {
  for (const hash of [
    "#",
    "#,,,",
    "#0.5,0.1,240",
    "#Infinity,0,0,100",
    "#0.5,-1,0,100",
    "#2,0,0,100",
    "#0.5,0,361,100",
    "#0.5,0,0,101",
  ]) {
    assert.equal(colorFromUrl(new URL(`https://example.test/${hash}`)), null);
  }
});
test("evaluates arithmetic with precedence, parentheses, and unary signs", () => {
  assert.equal(calculateChannel("2 + 3 * 4"), 14);
  assert.equal(calculateChannel("(2 + 3) * 4"), 20);
  close(calculateChannel(".5 / 2 - 0.1"), 0.15);
  assert.equal(calculateChannel("-2 * -3"), 6);
});
test("rejects incomplete, executable, and nonfinite expressions", () => {
  for (const input of [
    "1+",
    "1/0",
    "",
    "1..2",
    "(1+2",
    "2**3",
    "Math.random()",
    "1;alert(1)",
    "()",
    "1e999",
  ]) {
    assert.equal(calculateChannel(input), null, input);
  }
});
test("undoes mode changes and clears redo after a new edit", () => {
  const initial = { future: [], past: [], present: DEFAULT_COLOR };
  const converted = changeMode(DEFAULT_COLOR, "lch");
  const changed = historyReducer(initial, { type: "set", value: converted });
  const undone = historyReducer(changed, { type: "undo" });
  assert.deepEqual(undone.present, DEFAULT_COLOR);
  assert.deepEqual(historyReducer(undone, { type: "redo" }).present, converted);
  assert.equal(
    historyReducer(undone, { type: "set", value: { ...DEFAULT_COLOR, h: 120 } }).future.length,
    0,
  );
  assert.equal(historyReducer(initial, { type: "undo" }), initial);
  assert.equal(historyReducer(initial, { type: "set", value: DEFAULT_COLOR }), initial);
});
test("maps graph pointers and keyboard positions consistently", () => {
  for (const plane of ["l", "c", "h"]) {
    const color = planeColor(DEFAULT_COLOR, plane, 0.25, 0.75, 0.4);
    const [x, y] = planePosition(color, plane, 0.4);
    close(x, 0.25);
    close(y, 0.75);
    close(color[plane], DEFAULT_COLOR[plane]);
  }
});
test("samples nested 3D boundaries at fixed lightness and hue", () => {
  for (const mode of ["oklch", "lch"]) {
    const l = mode === "oklch" ? 0.6 : 60;
    const srgb = boundaryChroma(mode, "srgb", l, 140);
    const p3 = boundaryChroma(mode, "p3", l, 140);
    const rec = boundaryChroma(mode, "rec2020", l, 140);
    assert.ok(srgb > 0);
    assert.ok(p3 >= srgb);
    assert.ok(rec >= p3);
    assert.ok(
      toColor({ alpha: 1, c: srgb, h: 140, l, mode }).inGamut("srgb", { epsilon: 0.00001 }),
    );
    assert.ok(
      !toColor({ alpha: 1, c: srgb * 1.01, h: 140, l, mode }).inGamut("srgb", { epsilon: 0.00001 }),
    );
  }
});
