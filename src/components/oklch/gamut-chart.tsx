import { useEffect, useRef, useState } from "react";
import { planeColor, planePosition } from "../../utils/gamut";
import type { Plane } from "../../utils/gamut";
import { clamp, lightnessMax, patchColor } from "../../utils/oklch";
import type { PickerColor } from "../../utils/oklch";
import { translate } from "../../i18n/messages";
import type { Language } from "../../utils/preferences";

interface Props {
  value: PickerColor;
  plane: Plane;
  maxChroma: number;
  p3: boolean;
  rec2020: boolean;
  onPreview: (value: PickerColor) => void;
  onFinish: () => void;
  onCommit: (value: PickerColor) => void;
  language: Language;
}
export const GamutChart = ({
  value,
  plane,
  maxChroma,
  p3,
  rec2020,
  onPreview,
  onFinish,
  onCommit,
  language,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const [error, setError] = useState(false);
  const [pixelSize, setPixelSize] = useState({ height: 128, width: 192 });
  useEffect(() => {
    const worker = new Worker(new URL("gamut.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.addEventListener("error", () => setError(true));
    worker.addEventListener("message", (event) => {
      const { data } = event;
      if (data.id !== requestId.current) {
        return;
      }
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", {
        colorSpace: data.displayP3 ? "display-p3" : "srgb",
      });
      if (!canvas || !context) {
        return;
      }
      canvas.width = data.width;
      canvas.height = data.height;
      const pixels = new ImageData(new Uint8ClampedArray(data.pixels), data.width, data.height, {
        colorSpace: data.displayP3 ? "display-p3" : "srgb",
      });
      context.putImageData(pixels, 0, 0);
    });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      setPixelSize((current) =>
        current.width === width && current.height === height ? current : { height, width },
      );
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  const fixed = value[plane];
  useEffect(() => {
    // Only the fixed coordinate affects a plane's pixels; moving its marker is immediate.
    requestId.current += 1;
    const id = requestId.current;
    const timeout = window.setTimeout(() => {
      workerRef.current?.postMessage({
        displayP3: window.matchMedia("(color-gamut: p3)").matches,
        height: pixelSize.height,
        id,
        maxChroma,
        p3,
        plane,
        rec2020,
        type: "chart",
        value: {
          alpha: 1,
          c: plane === "c" ? fixed : 0,
          h: plane === "h" ? fixed : 0,
          l: plane === "l" ? fixed : 0,
          mode: value.mode,
        },
        width: pixelSize.width,
      });
    }, 24);
    return () => window.clearTimeout(timeout);
  }, [value.mode, fixed, plane, maxChroma, p3, rec2020, pixelSize]);
  const [x, y] = planePosition(value, plane, maxChroma);
  const xLabel = translate(language, plane === "h" ? "xLightness" : "xHue");
  const yLabel = translate(language, plane === "c" ? "yLightness" : "yChroma");
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = planeColor(
      value,
      plane,
      clamp((event.clientX - rect.left) / rect.width, 0, 1),
      clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1),
      maxChroma,
    );
    onPreview({ ...next, alpha: value.alpha });
  };
  return (
    <div className="ok-chart-wrap">
      <div
        className="ok-chart"
        // A two-dimensional slider requires a custom surface, not a one-axis input.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="slider"
        tabIndex={0}
        aria-label={`${xLabel}·${yLabel} ${translate(language, "graphs")}`}
        aria-valuemin={0}
        aria-valuemax={plane === "h" ? lightnessMax(value.mode) : 360}
        aria-valuenow={plane === "h" ? value.l : value.h}
        aria-valuetext={`L ${value.l.toFixed(3)}, C ${value.c.toFixed(3)}, H ${value.h.toFixed(1)}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
          move(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            move(event);
          }
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          onFinish();
        }}
        onPointerCancel={onFinish}
        onLostPointerCapture={onFinish}
        onKeyDown={(event) => {
          if (
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
          ) {
            return;
          }
          event.preventDefault();
          const step = event.shiftKey ? 0.001 : 0.01;
          let nx = clamp(x + ({ ArrowLeft: -step, ArrowRight: step }[event.key] ?? 0), 0, 1);
          if (event.key === "Home") {
            nx = 0;
          }
          if (event.key === "End") {
            nx = 1;
          }
          const ny = clamp(y + ({ ArrowDown: -step, ArrowUp: step }[event.key] ?? 0), 0, 1);
          onCommit(
            patchColor(value, {
              ...planeColor(value, plane, nx, ny, maxChroma),
              alpha: value.alpha,
            }),
          );
        }}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <span
          className="ok-marker"
          style={{ left: `${clamp(x, 0, 1) * 100}%`, top: `${(1 - clamp(y, 0, 1)) * 100}%` }}
        />
      </div>
      <div className="ok-axis">
        <span>↑ {yLabel}</span>
        <span>{xLabel} →</span>
      </div>
      {error && <p role="alert">{translate(language, "graphError")}</p>}
    </div>
  );
};
