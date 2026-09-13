import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/messages";
import { contrastRatio, hexToRgb, normalizeHex } from "../../utils/contrast";
import "./checker.css";

const copy = {
  en: {
    aa: "WCAG AA",
    aaa: "WCAG AAA",
    alpha: "Opacity",
    background: "Background",
    copyLink: "Copy result link",
    copied: "Result link copied.",
    description: "Check whether two colors are readable together under WCAG contrast requirements.",
    foreground: "Foreground",
    graphic: "UI & graphics",
    invalid: "Enter a 3 or 6 digit HEX color.",
    large: "Large text",
    largeHint: "24px+, or 18.66px+ bold",
    normal: "Normal text",
    normalHint: "Text smaller than large text",
    preview: "Live preview",
    ratio: "Contrast ratio",
    shareFailed: "Could not access the clipboard. Copy the URL from the address bar.",
    swap: "Swap colors",
    title: "Contrast checker",
    uiHint: "Icons, controls, and boundaries",
  },
  ko: {
    aa: "WCAG AA",
    aaa: "WCAG AAA",
    alpha: "불투명도",
    background: "배경색",
    copyLink: "결과 링크 복사",
    copied: "결과 링크를 복사했습니다.",
    description: "두 색상의 조합이 WCAG 명암비 기준을 만족하는지 바로 확인하세요.",
    foreground: "전경색",
    graphic: "UI 및 그래픽",
    invalid: "3자리 또는 6자리 HEX 색상을 입력하세요.",
    large: "큰 텍스트",
    largeHint: "24px 이상 또는 굵은 18.66px 이상",
    normal: "일반 텍스트",
    normalHint: "큰 텍스트보다 작은 글자",
    preview: "실시간 미리보기",
    ratio: "명암비",
    shareFailed: "클립보드에 접근할 수 없습니다. 주소창의 URL을 복사해 주세요.",
    swap: "색상 바꾸기",
    title: "명암비 검사기",
    uiHint: "아이콘, 컨트롤 및 경계선",
  },
} as const;

type ColorFieldProps = {
  error: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
};

const ColorField = ({ error, label, onChange, value }: ColorFieldProps) => (
  <label className={`contrast-color-field${error ? " is-invalid" : ""}`}>
    <span>{label}</span>
    <div className="contrast-color-control">
      <input
        type="color"
        value={normalizeHex(value) ?? "#000000"}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        aria-label={`${label} picker`}
      />
      <span aria-hidden="true">#</span>
      <input
        type="text"
        value={value.replace(/^#/u, "")}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        inputMode="text"
        maxLength={6}
        aria-invalid={error}
      />
    </div>
  </label>
);

const Result = ({
  label,
  hint,
  ratio,
  thresholds,
}: {
  hint: string;
  label: string;
  ratio: number;
  thresholds: number[];
}) => (
  <article className="contrast-result-card">
    <div>
      <h3>{label}</h3>
      <p>{hint}</p>
    </div>
    <div className="contrast-badges">
      {thresholds.map((threshold, index) => {
        const pass = ratio >= threshold;
        return (
          <span key={threshold} className={pass ? "is-pass" : "is-fail"}>
            {index === 0 ? "AA" : "AAA"} <strong>{pass ? "PASS" : "FAIL"}</strong>
          </span>
        );
      })}
    </div>
  </article>
);

export default function ContrastChecker() {
  const language = useLanguage();
  const t = copy[language];
  const initial = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      background: normalizeHex(params.get("background") ?? "") ?? "#FFFFFF",
      foreground: normalizeHex(params.get("foreground") ?? "") ?? "#24292F",
      opacity: Math.min(100, Math.max(0, Number(params.get("opacity")) || 100)),
    };
  }, []);
  const [foreground, setForeground] = useState(initial.foreground);
  const [background, setBackground] = useState(initial.background);
  const [opacity, setOpacity] = useState(initial.opacity);
  const [notice, setNotice] = useState("");
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);
  const ratio =
    foregroundRgb && backgroundRgb
      ? contrastRatio(foregroundRgb, backgroundRgb, opacity / 100)
      : null;
  const foregroundError = foreground.length > 0 && !foregroundRgb;
  const backgroundError = background.length > 0 && !backgroundRgb;
  const renderedForeground =
    foregroundRgb && backgroundRgb
      ? `color-mix(in srgb, ${normalizeHex(foreground)} ${opacity}%, ${normalizeHex(background)})`
      : "currentColor";

  useEffect(() => {
    if (foregroundRgb && backgroundRgb) {
      const url = new URL(location.href);
      url.searchParams.set("foreground", normalizeHex(foreground)?.slice(1) ?? "");
      url.searchParams.set("background", normalizeHex(background)?.slice(1) ?? "");
      url.searchParams.set("opacity", String(opacity));
      history.replaceState(null, "", url);
    }
  }, [foreground, background, opacity, foregroundRgb, backgroundRgb]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice(t.copied);
    } catch {
      setNotice(t.shareFailed);
    }
    window.setTimeout(() => setNotice(""), 4000);
  };

  return (
    <div className="contrast-checker">
      <header className="contrast-heading">
        <div>
          <p className="contrast-eyebrow">ACCESSIBILITY TOOL</p>
          <h1>{t.title}</h1>
          <p>{t.description}</p>
        </div>
        <button type="button" className="contrast-share" onClick={() => void copyLink()}>
          {t.copyLink}
        </button>
      </header>

      <div className="contrast-grid">
        <section className="contrast-controls" aria-label={t.title}>
          <ColorField
            label={t.foreground}
            value={foreground}
            onChange={setForeground}
            error={foregroundError}
          />
          <div className="contrast-opacity">
            <div>
              <label htmlFor="contrast-opacity">{t.alpha}</label>
              <output>{opacity}%</output>
            </div>
            <input
              id="contrast-opacity"
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="contrast-swap"
            onClick={() => {
              setForeground(background);
              setBackground(foreground);
            }}
            aria-label={t.swap}
          >
            ⇅ <span>{t.swap}</span>
          </button>
          <ColorField
            label={t.background}
            value={background}
            onChange={setBackground}
            error={backgroundError}
          />
          {(foregroundError || backgroundError) && (
            <p className="contrast-error" role="alert">
              {t.invalid}
            </p>
          )}
        </section>

        <section className="contrast-summary" aria-live="polite">
          <p>{t.ratio}</p>
          <strong>
            {ratio === null ? "—" : ratio.toFixed(2)}
            <small>:1</small>
          </strong>
          <div className="contrast-meter" aria-hidden="true">
            <i style={{ width: `${ratio === null ? 0 : Math.min(100, (ratio / 21) * 100)}%` }} />
          </div>
          <span>1</span>
          <span>3</span>
          <span>4.5</span>
          <span>7</span>
          <span>21</span>
        </section>
      </div>

      <section
        className="contrast-preview"
        style={{
          backgroundColor: normalizeHex(background) ?? undefined,
          color: renderedForeground,
        }}
      >
        <p>{t.preview}</p>
        <strong>The quick brown fox jumps over the lazy dog.</strong>
        <span>0123456789 · Aa Bb Cc</span>
      </section>

      <section className="contrast-results" aria-label={`${t.aa} / ${t.aaa}`}>
        <Result label={t.normal} hint={t.normalHint} ratio={ratio ?? 0} thresholds={[4.5, 7]} />
        <Result label={t.large} hint={t.largeHint} ratio={ratio ?? 0} thresholds={[3, 4.5]} />
        <Result label={t.graphic} hint={t.uiHint} ratio={ratio ?? 0} thresholds={[3]} />
      </section>
      <output className="contrast-notice" aria-live="polite">
        {notice}
      </output>
    </div>
  );
}
