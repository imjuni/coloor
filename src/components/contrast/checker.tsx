import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/messages";
import { contrastRatio, hexToRgb, normalizeHex } from "../../utils/contrast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppIntlProvider } from "../../i18n/provider";

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
  <label className="grid gap-2 text-sm font-medium text-muted-foreground">
    <span>{label}</span>
    <div
      className={`flex h-12 items-center gap-2 rounded-md border bg-background px-2 shadow-xs focus-within:ring-2 focus-within:ring-ring ${error ? "border-destructive" : ""}`}
    >
      <input
        className="size-8 cursor-pointer rounded-md border-0 bg-transparent p-0"
        type="color"
        value={normalizeHex(value) ?? "#000000"}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        aria-label={`${label} picker`}
      />
      <span className="font-mono font-semibold" aria-hidden="true">
        #
      </span>
      <Input
        className="h-auto border-0 bg-transparent px-0 font-mono font-semibold uppercase shadow-none focus-visible:ring-0"
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
  <Card className="min-h-28 flex-row items-center justify-between gap-5 p-5 xl:p-6">
    <div className="min-w-0">
      <h3 className="text-lg font-semibold leading-tight">{label}</h3>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">{hint}</p>
    </div>
    <div className="flex flex-wrap justify-end gap-2">
      {thresholds.map((threshold, index) => {
        const pass = ratio >= threshold;
        return (
          <Badge
            className="h-7 px-2.5 text-xs"
            key={threshold}
            variant={pass ? "default" : "destructive"}
          >
            {index === 0 ? "AA" : "AAA"} <strong>{pass ? "PASS" : "FAIL"}</strong>
          </Badge>
        );
      })}
    </div>
  </Card>
);

const ContrastCheckerContent = () => {
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
    <div className="min-h-[calc(100dvh-68px)] bg-muted/35 px-4 py-9 sm:px-8 lg:px-12">
      <header className="mx-auto mb-7 flex max-w-7xl flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary">ACCESSIBILITY TOOL</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t.description}</p>
        </div>
        <Button type="button" onClick={() => void copyLink()}>
          {t.copyLink}
        </Button>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,.7fr)]">
        <Card className="relative grid gap-5 p-5 md:grid-cols-2 md:gap-x-11" aria-label={t.title}>
          <ColorField
            label={t.foreground}
            value={foreground}
            onChange={setForeground}
            error={foregroundError}
          />
          <div className="grid gap-2">
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
              <label htmlFor="contrast-opacity">{t.alpha}</label>
              <output className="text-xs font-bold">{opacity}%</output>
            </div>
            <input
              className="w-full accent-primary"
              id="contrast-opacity"
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </div>
          <Button
            type="button"
            className="absolute left-1/2 top-10 size-9 -translate-x-1/2 rotate-90 rounded-full max-md:hidden"
            size="icon"
            variant="outline"
            onClick={() => {
              setForeground(background);
              setBackground(foreground);
            }}
            aria-label={t.swap}
          >
            ⇅ <span className="sr-only">{t.swap}</span>
          </Button>
          <ColorField
            label={t.background}
            value={background}
            onChange={setBackground}
            error={backgroundError}
          />
          {(foregroundError || backgroundError) && (
            <p className="col-span-full -mt-2 text-xs text-destructive" role="alert">
              {t.invalid}
            </p>
          )}
        </Card>

        <Card className="p-5" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t.ratio}
          </p>
          <strong className="mt-2 block text-5xl tracking-tighter text-primary">
            {ratio === null ? "—" : ratio.toFixed(2)}
            <small>:1</small>
          </strong>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <i
              className="block h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
              style={{ width: `${ratio === null ? 0 : Math.min(100, (ratio / 21) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>1</span>
            <span>3</span>
            <span>4.5</span>
            <span>7</span>
            <span>21</span>
          </div>
        </Card>
      </div>

      <section
        className="mx-auto mt-4 grid min-h-56 max-w-7xl content-center rounded-xl border p-8 shadow-sm"
        style={{
          backgroundColor: normalizeHex(background) ?? undefined,
          color: renderedForeground,
        }}
      >
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">{t.preview}</p>
        <strong className="mt-3 text-2xl">The quick brown fox jumps over the lazy dog.</strong>
        <span className="mt-2 font-mono text-sm opacity-75">0123456789 · Aa Bb Cc</span>
      </section>

      <section
        className="mx-auto mt-4 grid max-w-7xl gap-4 lg:grid-cols-3"
        aria-label={`${t.aa} / ${t.aaa}`}
      >
        <Result label={t.normal} hint={t.normalHint} ratio={ratio ?? 0} thresholds={[4.5, 7]} />
        <Result label={t.large} hint={t.largeHint} ratio={ratio ?? 0} thresholds={[3, 4.5]} />
        <Result label={t.graphic} hint={t.uiHint} ratio={ratio ?? 0} thresholds={[3]} />
      </section>
      <output
        className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-sm text-background empty:hidden"
        aria-live="polite"
      >
        {notice}
      </output>
    </div>
  );
};

const ContrastChecker = () => (
  <AppIntlProvider>
    <ContrastCheckerContent />
  </AppIntlProvider>
);

export default ContrastChecker;
