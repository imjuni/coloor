import { useMemo } from "react";
import { chromaMax, lightnessMax, nativeCode, patchColor } from "../../utils/oklch";
import type { Channel, PickerColor } from "../../utils/oklch";
import { GamutChart } from "./gamut-chart";
import { NumberField } from "./fields";
import { translate } from "../../i18n/messages";
import type { Language } from "../../utils/preferences";
import { Card } from "@/components/ui/card";

interface Props {
  channel: Channel;
  value: PickerColor;
  graphs: boolean;
  p3: boolean;
  rec2020: boolean;
  onCommit: (value: PickerColor) => void;
  onPreview: (value: PickerColor) => void;
  onFinish: () => void;
  language: Language;
}
export const ChannelCard = ({
  channel,
  value,
  graphs,
  p3,
  rec2020,
  onCommit,
  onPreview,
  onFinish,
  language,
}: Props) => {
  const maxC = Math.max(chromaMax(value.mode, rec2020), value.c);
  const ranges = { alpha: 1, c: maxC, h: 360, l: lightnessMax(value.mode) };
  const steps = {
    alpha: 0.01,
    c: value.mode === "oklch" ? 0.001 : 0.1,
    h: 1,
    l: lightnessMax(value.mode) / 100,
  };
  const max = ranges[channel];
  const step = steps[channel];
  const gradient = useMemo(
    () =>
      `linear-gradient(to right, ${Array.from({ length: 25 }, (_, index) => nativeCode({ ...value, [channel]: (max * index) / 24, ...(channel === "alpha" ? {} : { alpha: 1 }) })).join(", ")})`,
    [value, channel, max],
  );
  const displayValue = channel === "alpha" ? value.alpha * 100 : value[channel];
  const label = translate(language, channel);
  return (
    <Card className={`ok-card ok-channel ok-channel-${channel}`}>
      <div className="ok-card-heading">
        <h2>
          {label} <span>{channel === "alpha" ? "α" : channel.toUpperCase()}</span>
        </h2>
        <NumberField
          key={`${value.mode}-${channel}`}
          label={`${label} ${translate(language, "value")}`}
          language={language}
          shortcut={channel === "alpha" ? "a" : channel}
          value={displayValue}
          min={0}
          max={channel === "alpha" ? 100 : max}
          step={channel === "alpha" ? 1 : step}
          onChange={(next) =>
            onCommit(patchColor(value, { [channel]: channel === "alpha" ? next / 100 : next }))
          }
        />
      </div>
      {graphs && channel !== "alpha" && (
        <GamutChart
          value={value}
          plane={channel}
          maxChroma={maxC}
          p3={p3}
          rec2020={rec2020}
          onCommit={onCommit}
          onPreview={onPreview}
          onFinish={onFinish}
          language={language}
        />
      )}
      <div className="ok-range-track checker">
        <input
          aria-label={`${label} ${translate(language, "slider")}`}
          type="range"
          min={0}
          max={max}
          step={step}
          value={value[channel]}
          style={{ background: gradient }}
          onChange={(event) =>
            onPreview(patchColor(value, { [channel]: Number(event.target.value) }))
          }
          onPointerUp={onFinish}
          onPointerCancel={onFinish}
          onKeyUp={onFinish}
          onBlur={onFinish}
        />
      </div>
      <div className="ok-axis">
        <span>0{channel === "alpha" ? "%" : ""}</span>
        <span>{channel === "alpha" ? "100%" : max}</span>
      </div>
    </Card>
  );
};
