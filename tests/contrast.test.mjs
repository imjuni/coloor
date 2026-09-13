import assert from "node:assert/strict";
import test from "node:test";
import { contrastRatio, hexToRgb, normalizeHex } from "../src/utils/contrast.ts";

test("normalizes short and long hex colors", () => {
  assert.equal(normalizeHex("abc"), "#AABBCC");
  assert.equal(normalizeHex("#12aBcF"), "#12ABCF");
  assert.equal(normalizeHex("blue"), null);
});

test("calculates the maximum WCAG contrast ratio", () => {
  assert.equal(contrastRatio(hexToRgb("#000"), hexToRgb("#fff")).toFixed(2), "21.00");
});

test("composites foreground opacity before calculating contrast", () => {
  const ratio = contrastRatio(hexToRgb("#000"), hexToRgb("#fff"), 0.5);
  assert.equal(ratio.toFixed(2), "3.98");
});
