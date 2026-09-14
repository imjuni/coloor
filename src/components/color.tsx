import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alpha,
  hexToHsva,
  hsvaToHex,
  hsvaToRgbaString,
  Hue,
  rgbaStringToHsva,
  Saturation,
} from "@uiw/react-color";
import type { HsvaColor } from "@uiw/react-color";
import type { PointerProps } from "@uiw/react-color";
import styled from "@emotion/styled";
import { StyledDivPageBody, StyledDivPageBox } from "./layout";
import { uiPrimaryFont, uiPrimaryInvertFont } from "../design/color";
import { mainAtom, reducer as mainReducer } from "../atom/color";
import { useReducerAtom } from "jotai/utils";
import ColorValue from "colorjs.io";
import { adjustLightness, toHex, toRgbChannels } from "../utils/color";
import { bignumber } from "mathjs";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntl } from "react-intl";

const COLOR_INPUT_DEBOUNCE_MS = 200;
const COLOR_HISTORY_LIMIT = 30;
const COLOR_HISTORY_STORAGE_KEY = "coloor:picker-history";
const SHADE_LEVELS = Array.from({ length: 10 }, (_, index) => index + 1);

interface ColorInputChange {
  format: "hex" | "rgba";
  value: string;
}

interface HorizontalColorPickerProps {
  className?: string;
  hsva: HsvaColor;
  onChange: (color: HsvaColor) => void;
  onCommit: (color: HsvaColor) => void;
}

const SliderPointer = ({ left = "0%" }: PointerProps) => (
  <span
    aria-hidden="true"
    className="picker-slider-pointer"
    style={{ left: `clamp(9px, ${left}, calc(100% - 9px))` }}
  />
);

const HorizontalColorPicker = ({
  className,
  hsva,
  onChange,
  onCommit,
}: HorizontalColorPickerProps) => {
  const [hexInput, setHexInput] = useState(() => hsvaToHex(hsva).slice(1).toUpperCase());
  const [rgbaInput, setRgbaInput] = useState(() => hsvaToRgbaString(hsva));
  const inputChanges = useMemo(() => new Subject<ColorInputChange>(), []);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const latestColorRef = useRef(hsva);

  useEffect(() => {
    onChangeRef.current = onChange;
    onCommitRef.current = onCommit;
  }, [onChange, onCommit]);

  useEffect(() => {
    latestColorRef.current = hsva;
    setHexInput(hsvaToHex(hsva).slice(1).toUpperCase());
    setRgbaInput(hsvaToRgbaString(hsva));
  }, [hsva.a, hsva.h, hsva.s, hsva.v]);

  useEffect(() => {
    const subscription = inputChanges
      .pipe(
        debounceTime(COLOR_INPUT_DEBOUNCE_MS),
        distinctUntilChanged(
          (previous, current) =>
            previous.format === current.format && previous.value === current.value,
        ),
      )
      .subscribe(({ format, value }) => {
        if (format === "hex") {
          if (/^[\dA-Fa-f]{6}$/u.test(value)) {
            const color = { ...hexToHsva(`#${value}`), a: hsva.a };
            onChangeRef.current(color);
            onCommitRef.current(color);
          }
          return;
        }

        const match =
          /^rgba\(\s*(?<red>\d{1,3})\s*,\s*(?<green>\d{1,3})\s*,\s*(?<blue>\d{1,3})\s*,\s*(?<alpha>(?:0|1)(?:\.\d+)?|\.\d+)\s*\)$/iu.exec(
            value,
          );
        if (!match?.groups) {
          return;
        }
        const channels = [match.groups.red, match.groups.green, match.groups.blue].map(Number);
        const nextAlpha = Number(match.groups.alpha);
        if (channels.some((channel) => channel > 255) || nextAlpha > 1) {
          return;
        }
        const color = rgbaStringToHsva(value);
        onChangeRef.current(color);
        onCommitRef.current(color);
      });

    return () => subscription.unsubscribe();
  }, [inputChanges, hsva.a]);

  const previewColor = (color: HsvaColor) => {
    latestColorRef.current = color;
    onChange(color);
  };

  const commitLatestColor = () => onCommit(latestColorRef.current);

  return (
    <div className={className}>
      <div
        className="picker-saturation"
        onPointerUp={commitLatestColor}
        onKeyUp={commitLatestColor}
      >
        <Saturation hsva={hsva} style={{ height: "100%", width: "100%" }} onChange={previewColor} />
      </div>
      <div className="picker-controls">
        <div className="picker-swatch" style={{ backgroundColor: hsvaToRgbaString(hsva) }} />
        <div
          className="picker-slider picker-hue"
          onPointerUp={commitLatestColor}
          onKeyUp={commitLatestColor}
        >
          <Hue
            hue={hsva.h}
            direction="horizontal"
            height={18}
            width="100%"
            pointer={SliderPointer}
            onChange={({ h }) => previewColor({ ...hsva, h })}
          />
        </div>
        <div
          className="picker-slider picker-alpha"
          onPointerUp={commitLatestColor}
          onKeyUp={commitLatestColor}
        >
          <Alpha
            hsva={hsva}
            direction="horizontal"
            height={18}
            width="100%"
            pointer={SliderPointer}
            onChange={({ a }) => previewColor({ ...hsva, a })}
          />
        </div>
        <div className="picker-values">
          <label className="picker-value picker-hex">
            <span>HEX</span>
            <div>
              <span aria-hidden="true">#</span>
              <Input
                aria-label="HEX color"
                maxLength={6}
                value={hexInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setHexInput(value);
                  inputChanges.next({ format: "hex", value });
                }}
              />
            </div>
          </label>
          <label className="picker-value picker-rgba">
            <span>RGBA</span>
            <div>
              <Input
                aria-label="RGBA color"
                value={rgbaInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setRgbaInput(value);
                  inputChanges.next({ format: "rgba", value });
                }}
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

const StyledStackBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 2.5rem) 1rem 1.5rem;
  justify-content: center;
  z-index: 100;
`;

const StyledStackShadeBox = styled.div`
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(260px, 0.85fr) minmax(300px, 1fr);
  width: min(1180px, calc(100vw - 2rem));
  min-height: 420px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--foreground), transparent 84%);
  border-radius: 18px;
  box-shadow: 0 12px 32px rgb(15 23 42 / 16%);

  .shade-stack {
    display: grid;
    grid-template-rows: repeat(10, 1fr);
    min-width: 0;
  }

  .shade {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 52px;
    align-items: center;
    gap: 9px;
    min-height: 76px;
    padding: 8px 9px;
    border-bottom: 1px solid rgb(255 255 255 / 10%);
    color: inherit;
    background: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    transition: box-shadow 120ms ease;
  }

  .shade:last-child {
    border-bottom: 0;
  }

  .shade:hover {
    position: relative;
    z-index: 1;
    box-shadow:
      inset 0 0 0 2px rgb(255 255 255 / 35%),
      0 5px 16px rgb(15 23 42 / 16%);
  }

  .shade-step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 5px;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
    opacity: 0.68;
  }

  .shade-values {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .shade-value {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) 27px;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  .shade-value > span {
    font-size: 9px;
    font-weight: 700;
    opacity: 0.65;
  }

  .shade-value code {
    overflow: hidden;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shade button {
    border: 1px solid rgb(255 255 255 / 28%);
    border-radius: 6px;
    color: white;
    background: rgb(15 23 42 / 48%);
    box-shadow: 0 2px 5px rgb(15 23 42 / 12%);
    cursor: pointer;
    font-size: 9px;
    font-weight: 750;
  }

  .shade-copy {
    width: 27px;
    height: 24px;
    padding: 0;
    font-size: 13px !important;
  }

  .shade-apply {
    height: 100%;
    min-height: 58px;
    padding: 0 6px;
    border-radius: 8px !important;
    background: rgb(15 23 42 / 66%) !important;
    font-size: 11px !important;
  }

  .shade button:hover {
    background: rgb(15 23 42 / 78%);
  }

  .shade button:focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 2px;
  }

  .selected-color {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-width: 0;
    padding: 22px;
  }

  .selected-color::before {
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image:
      linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
      linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
      linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0;
    background-size: 16px 16px;
    content: "";
  }

  .selected-color-fill {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .selected-color-values {
    position: relative;
    z-index: 2;
    display: grid;
    gap: 8px;
    padding: 14px;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 12px;
    background: rgb(15 23 42 / 64%);
    box-shadow: 0 8px 24px rgb(15 23 42 / 20%);
    color: white;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    backdrop-filter: blur(10px);
  }

  .selected-color-value {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
  }

  .selected-color-value span {
    font-size: 11px;
    font-weight: 700;
    opacity: 0.68;
  }

  .selected-color-value strong {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media screen and (max-width: 760px) {
    grid-template-columns: 1fr;

    .selected-color {
      min-height: 260px;
      order: -1;
    }
  }
`;

const StyledStackColorPickerBox = styled.div`
  display: flex;
  width: min(1180px, calc(100vw - 2rem));

  .picker-widget {
    display: grid;
    grid-template-columns: minmax(320px, 0.9fr) minmax(620px, 1.6fr);
    align-items: stretch;
    gap: 12px;
    box-sizing: border-box !important;
    width: 100% !important;
    padding: 14px !important;
    border: 1px solid color-mix(in srgb, var(--foreground), transparent 82%);
    border-radius: 16px !important;
    background: color-mix(in srgb, var(--background), var(--foreground) 7%);
    box-shadow: 0 12px 32px rgb(15 23 42 / 18%) !important;
  }

  .picker-saturation {
    position: relative;
    min-height: 148px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--foreground), transparent 80%);
    border-radius: 10px;
  }

  .picker-controls {
    display: grid;
    grid-template-columns: 58px minmax(300px, 1fr) minmax(210px, 0.72fr);
    grid-template-rows: 1fr 1fr;
    align-items: center;
    gap: 10px 12px;
    min-height: 148px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--foreground), transparent 86%);
    border-radius: 10px;
    background: var(--background);
  }

  .picker-swatch {
    grid-row: 1 / -1;
    width: 52px;
    height: 52px;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 3px 12px rgb(15 23 42 / 22%);
  }

  .picker-slider {
    position: relative;
    height: 18px;
    overflow: hidden;
    border-radius: 999px;
  }

  .picker-slider-pointer {
    position: absolute;
    top: 50%;
    z-index: 2;
    display: block;
    width: 18px;
    height: 18px;
    border: 2px solid white;
    border-radius: 50%;
    background: #f8fafc;
    box-shadow: 0 1px 4px rgb(15 23 42 / 38%);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .picker-hue {
    grid-column: 2;
    grid-row: 1;
    align-self: end;
  }

  .picker-alpha {
    grid-column: 2;
    grid-row: 2;
    align-self: start;
  }

  .picker-values {
    display: grid;
    grid-column: 3;
    grid-row: 1 / -1;
    gap: 8px;
  }

  .picker-value {
    display: grid;
    gap: 5px;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .picker-value > div {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 12px;
    border: 1px solid #d8dee6;
    border-radius: 9px;
    color: #334155;
    background: #f8fafc;
    font:
      700 18px ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace;
  }

  .picker-value input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    color: inherit;
    background: transparent;
    font: inherit;
  }

  .picker-rgba input {
    font-size: 14px;
    letter-spacing: -0.03em;
  }

  @media screen and (max-width: 960px) {
    .picker-widget {
      grid-template-columns: 1fr;
    }

    .picker-saturation {
      min-height: 220px;
    }

    .picker-controls {
      grid-template-columns: 58px minmax(260px, 1fr) minmax(190px, 0.72fr);
    }
  }

  @media screen and (max-width: 680px) {
    .picker-controls {
      grid-template-columns: 58px 1fr;
      grid-template-rows: 1fr 1fr auto;
    }

    .picker-hue,
    .picker-alpha {
      grid-column: 2;
    }

    .picker-swatch {
      grid-row: 1 / 3;
    }

    .picker-values {
      grid-column: 1 / -1;
      grid-row: 3;
      grid-template-columns: 1fr 1fr;
    }
  }
`;

const StyledColorHistory = styled.section`
  width: min(1180px, calc(100vw - 2rem));
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground), transparent 86%);
  border-radius: 14px;
  background: color-mix(in srgb, var(--background), var(--foreground) 4%);

  h2 {
    margin: 0 0 12px;
    color: color-mix(in srgb, var(--foreground), transparent 35%);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .color-history-list {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 10px;
  }

  .color-history-content {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  button {
    position: relative;
    width: 42px;
    height: 42px;
    padding: 0;
    overflow: hidden;
    border: 2px solid color-mix(in srgb, var(--background), white 35%);
    border-radius: 50%;
    box-shadow: 0 2px 7px rgb(15 23 42 / 18%);
    cursor: pointer;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
  }

  button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 5px 12px rgb(15 23 42 / 24%);
  }

  button:focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 3px;
  }

  .color-history-clear {
    flex: none;
    width: auto;
    min-width: 64px;
    height: 42px;
    padding: 0 12px;
    border-color: color-mix(in srgb, var(--foreground), transparent 78%);
    border-radius: 9px;
    color: var(--foreground);
    background: var(--background);
    font-size: 12px;
    font-weight: 700;
  }

  .color-history-clear:disabled {
    opacity: 0.45;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`;

const useColorPropsBootstrap = () => {
  const [state, dispatch] = useReducerAtom(mainAtom, mainReducer);

  return { dispatch, state };
};

const calculateFontColor = (pickedColor: string) => {
  const [r, g, b] = toRgbChannels(new ColorValue(pickedColor));
  const red = bignumber(r).mul(bignumber(0.299));
  const green = bignumber(g).mul(bignumber(0.587));
  const blue = bignumber(b).mul(bignumber(0.114));
  const sum = red.plus(green).plus(blue);

  return sum.toNumber() > 186 ? uiPrimaryFont.toString() : uiPrimaryInvertFont.toString();
};

const Color: React.FC = () => {
  const intl = useIntl();
  const { state, dispatch } = useColorPropsBootstrap();
  const [alpha, setAlpha] = useState(1);
  const [hue, setHue] = useState(() => hexToHsva(state.color).h);
  const [history, setHistory] = useState<string[]>([]);
  const hsva = { ...hexToHsva(state.color), a: alpha, h: hue };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLOR_HISTORY_STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        setHistory(
          saved
            .filter((color): color is string => typeof color === "string")
            .slice(0, COLOR_HISTORY_LIMIT),
        );
      }
    } catch {
      localStorage.removeItem(COLOR_HISTORY_STORAGE_KEY);
    }
  }, []);

  const changePickerColor = (pickedColor: HsvaColor) => {
    setAlpha(pickedColor.a);
    setHue(pickedColor.h);
    dispatch({ color: hsvaToHex(pickedColor), type: "change-color" });
  };

  const saveColorToHistory = (pickedColor: HsvaColor) => {
    const color = hsvaToRgbaString(pickedColor);
    setHistory((previous) => {
      const next = [color, ...previous.filter((item) => item !== color)].slice(
        0,
        COLOR_HISTORY_LIMIT,
      );
      localStorage.setItem(COLOR_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <StyledDivPageBox>
      <StyledDivPageBody>
        <StyledStackBox className="picker-box">
          <StyledStackColorPickerBox>
            <HorizontalColorPicker
              className="picker-widget"
              hsva={hsva}
              onChange={changePickerColor}
              onCommit={saveColorToHistory}
            />
          </StyledStackColorPickerBox>

          <StyledColorHistory aria-label={intl.formatMessage({ id: "picker.history" })}>
            <h2>{intl.formatMessage({ id: "picker.history" })}</h2>
            <div className="color-history-content">
              <div className="color-history-list">
                {history.map((color) => (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={intl.formatMessage({ id: "picker.selectColor" }, { color })}
                    key={color}
                    type="button"
                    style={{ background: color }}
                    title={color}
                    onClick={() => {
                      const pickedColor = rgbaStringToHsva(color);
                      changePickerColor(pickedColor);
                      saveColorToHistory(pickedColor);
                    }}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                className="color-history-clear"
                disabled={history.length === 0}
                type="button"
                onClick={() => {
                  localStorage.removeItem(COLOR_HISTORY_STORAGE_KEY);
                  setHistory([]);
                }}
              >
                {intl.formatMessage({ id: "picker.clearHistory" })}
              </Button>
            </div>
          </StyledColorHistory>
        </StyledStackBox>

        <StyledStackShadeBox>
          <div className="shade-stack lighten-shade">
            {[...SHADE_LEVELS].reverse().map((index) => {
              const base = new ColorValue(state.color);
              const amount = bignumber(index).mul(bignumber(0.05));
              const processed = adjustLightness(base, amount.toNumber());
              const color = toHex(processed);
              const pickedColor = { ...hexToHsva(color), a: alpha };
              const rgba = hsvaToRgbaString(pickedColor);
              return (
                <div
                  className="shade"
                  key={index}
                  style={{
                    backgroundColor: processed.toString(),
                    color: calculateFontColor(color),
                  }}
                >
                  <span className="shade-step">+{amount.mul(100).toString()}%</span>
                  <div className="shade-values">
                    <div className="shade-value">
                      <span>HEX</span>
                      <code>{color.toUpperCase()}</code>
                      <Button
                        size="icon"
                        variant="secondary"
                        aria-label={`${color} 복사`}
                        title={intl.formatMessage({ id: "picker.copyHex" })}
                        type="button"
                        className="shade-copy"
                        onClick={() => navigator.clipboard.writeText(color.toUpperCase())}
                      >
                        ⧉
                      </Button>
                    </div>
                    <div className="shade-value">
                      <span>RGBA</span>
                      <code>{rgba}</code>
                      <Button
                        size="icon"
                        variant="secondary"
                        aria-label={`${rgba} 복사`}
                        title={intl.formatMessage({ id: "picker.copyRgba" })}
                        type="button"
                        className="shade-copy"
                        onClick={() => navigator.clipboard.writeText(rgba)}
                      >
                        ⧉
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    className="shade-apply"
                    onClick={() => {
                      changePickerColor(pickedColor);
                      saveColorToHistory(pickedColor);
                    }}
                  >
                    {intl.formatMessage({ id: "picker.apply" })}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="selected-color">
            <div
              className="selected-color-fill"
              style={{ backgroundColor: hsvaToRgbaString(hsva) }}
            />
            <div className="selected-color-values">
              <div className="selected-color-value">
                <span>HEX</span>
                <strong>{hsvaToHex(hsva).toUpperCase()}</strong>
              </div>
              <div className="selected-color-value">
                <span>RGBA</span>
                <strong>{hsvaToRgbaString(hsva)}</strong>
              </div>
            </div>
          </div>

          <div className="shade-stack darken-shade">
            {SHADE_LEVELS.map((index) => {
              const base = new ColorValue(state.color);
              const amount = bignumber(index).mul(bignumber(0.05));
              const processed = adjustLightness(base, -amount.toNumber());
              const color = toHex(processed);
              const pickedColor = { ...hexToHsva(color), a: alpha };
              const rgba = hsvaToRgbaString(pickedColor);
              return (
                <div
                  className="shade"
                  key={index}
                  style={{
                    backgroundColor: processed.toString(),
                    color: calculateFontColor(color),
                  }}
                >
                  <span className="shade-step">−{amount.mul(100).toString()}%</span>
                  <div className="shade-values">
                    <div className="shade-value">
                      <span>HEX</span>
                      <code>{color.toUpperCase()}</code>
                      <Button
                        size="icon"
                        variant="secondary"
                        aria-label={`${color} 복사`}
                        title={intl.formatMessage({ id: "picker.copyHex" })}
                        type="button"
                        className="shade-copy"
                        onClick={() => navigator.clipboard.writeText(color.toUpperCase())}
                      >
                        ⧉
                      </Button>
                    </div>
                    <div className="shade-value">
                      <span>RGBA</span>
                      <code>{rgba}</code>
                      <Button
                        size="icon"
                        variant="secondary"
                        aria-label={`${rgba} 복사`}
                        title={intl.formatMessage({ id: "picker.copyRgba" })}
                        type="button"
                        className="shade-copy"
                        onClick={() => navigator.clipboard.writeText(rgba)}
                      >
                        ⧉
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    className="shade-apply"
                    onClick={() => {
                      changePickerColor(pickedColor);
                      saveColorToHistory(pickedColor);
                    }}
                  >
                    {intl.formatMessage({ id: "picker.apply" })}
                  </Button>
                </div>
              );
            })}
          </div>
        </StyledStackShadeBox>
      </StyledDivPageBody>
    </StyledDivPageBox>
  );
};

export default Color;
