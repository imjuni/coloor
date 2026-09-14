import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { usePicker } from "../../hooks/use-picker";
import {
  changeMode,
  colorHash,
  fallbackColor,
  FORMATS,
  formatColor,
  fromColor,
  gamutOf,
  nativeCode,
  parseColor,
} from "../../utils/oklch";
import type { OutputFormat } from "../../utils/oklch";
import { ChannelCard } from "./channel-card";
import { CodeField } from "./fields";
import "./picker.css";
import { translate, useLanguage } from "../../i18n/messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppIntlProvider } from "../../i18n/provider";

const GamutModel = lazy(() => import("./gamut-model"));
const GAMUT_LABELS = {
  en: { out: "Outside display gamut", p3: "Display P3", rec2020: "Rec.2020", srgb: "sRGB" },
  ko: { out: "표시 색역 밖", p3: "Display P3", rec2020: "Rec.2020", srgb: "sRGB" },
} as const;
const ENGLISH_FORMATS = { ...FORMATS, auto: "Auto HEX / RGB", numbers: "Channel values" };

const OklchPicker = () => {
  const picker = usePicker();
  const language = useLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const { value, settings } = picker;
  const [notice, setNotice] = useState("");
  const [support, setSupport] = useState({ p3: false, rec2020: false });
  const gamut = useMemo(() => gamutOf(value), [value]);
  const output = useMemo(() => formatColor(value, settings.format), [value, settings.format]);
  const fallback = useMemo(() => fallbackColor(value), [value]);
  useEffect(() => {
    const p3 = window.matchMedia("(color-gamut: p3)");
    const rec2020 = window.matchMedia("(color-gamut: rec2020)");
    const sync = () => setSupport({ p3: p3.matches, rec2020: rec2020.matches });
    sync();
    p3.addEventListener("change", sync);
    rec2020.addEventListener("change", sync);
    return () => {
      p3.removeEventListener("change", sync);
      rec2020.removeEventListener("change", sync);
    };
  }, []);
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t("copied"));
    } catch {
      setNotice(t("copyFailed"));
    }
  };
  const parse = (text: string, figma = false) => {
    const parsed = parseColor(text, value.mode, figma);
    if (!parsed) {
      return false;
    }
    picker.commit(parsed);
    return true;
  };
  const unavailable =
    gamut === "out" || (gamut === "p3" && !support.p3) || (gamut === "rec2020" && !support.rec2020);
  return (
    <div className="ok-picker">
      <header className="ok-heading">
        <div>
          <p className="ok-eyebrow">COLOR EXPLORER</p>
          <h1>{t("tagline")}</h1>
          <p className="ok-muted">{t("intro")}</p>
        </div>
        <div className="ok-actions">
          <Button
            variant="outline"
            type="button"
            disabled={!picker.canUndo}
            onClick={() => picker.undo()}
            title="Ctrl / ⌘ + Z"
          >
            ↶ {t("undo")}
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={!picker.canRedo}
            onClick={() => picker.redo()}
            title="Ctrl / ⌘ + Shift + Z"
          >
            ↷ {t("redo")}
          </Button>
          <Button
            type="button"
            className="ok-primary"
            onClick={() => {
              const url = new URL(location.href);
              url.hash = colorHash(value);
              if (value.mode === "lch") {
                url.searchParams.set("space", "lch");
              } else {
                url.searchParams.delete("space");
              }
              void copy(url.href);
            }}
          >
            {t("copyLink")}
          </Button>
        </div>
      </header>
      <div className="ok-workspace">
        <aside className="ok-sidebar" aria-label={t("sidebar")}>
          <Card className="ok-card ok-color-panel">
            <fieldset className="ok-mode" aria-label={t("colorSpace")}>
              {(["oklch", "lch"] as const).map((mode) => (
                <Button
                  size="sm"
                  variant={value.mode === mode ? "default" : "outline"}
                  key={mode}
                  type="button"
                  aria-pressed={value.mode === mode}
                  onClick={() => picker.commit(changeMode(value, mode))}
                >
                  {mode.toUpperCase()}
                </Button>
              ))}
            </fieldset>
            <div className="ok-samples checker">
              <div className="ok-sample" style={{ backgroundColor: nativeCode(value) }}>
                <span>{t("selected")}</span>
              </div>
              <Button
                variant="ghost"
                type="button"
                className="ok-sample"
                style={{ backgroundColor: fallback.toString() }}
                onClick={() => picker.commit(fromColor(fallback, value.mode))}
                title={t("applyFallback")}
              >
                <span>{t("fallback")} ↗</span>
              </Button>
            </div>
            <div className="ok-gamut-status">
              <Badge variant={gamut === "out" ? "destructive" : "secondary"}>
                {GAMUT_LABELS[language][gamut]}
              </Badge>
              <span>
                {Math.round(value.alpha * 100)}% {t("opacity")}
              </span>
            </div>
            <p className="ok-display-note">
              {unavailable ? t("displayUnavailable") : t("displayOk")}
            </p>
            <CodeField
              key={`native-${value.mode}`}
              label={`${value.mode.toUpperCase()} ${t("colorCode")}`}
              language={language}
              code={nativeCode(value)}
              shortcut="o"
              onCommit={parse}
              onCopy={(code) => {
                void copy(code);
              }}
            />
            <label className="ok-format">
              {t("format")}
              <select
                aria-label={t("format")}
                value={settings.format}
                onChange={(event) =>
                  picker.setSettings((prev) => ({
                    ...prev,
                    format: event.target.value as OutputFormat,
                  }))
                }
              >
                {Object.entries(language === "en" ? ENGLISH_FORMATS : FORMATS).map(
                  ([format, label]) => (
                    <option key={format} value={format}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
            <CodeField
              key={`output-${settings.format}-${value.mode}`}
              label={t("convertedCode")}
              language={language}
              code={output}
              shortcut="r"
              onCommit={(text) => parse(text, settings.format === "figma")}
              onCopy={(code) => {
                void copy(code);
              }}
            />
            <p className="ok-muted">
              {settings.format === "figma" ? t("figmaHint") : t("pasteHint")}
            </p>
            {gamut !== "srgb" && ["auto", "hex", "rgb", "hsl"].includes(settings.format) && (
              <p className="ok-muted">{t("gamutMapped")}</p>
            )}
          </Card>
          <Card className="ok-card ok-settings">
            <h2>{t("settings")}</h2>
            <div className="ok-toggles">
              {(
                [
                  ["graphs", t("graphs")],
                  ["p3", "Display P3"],
                  ["rec2020", "Rec.2020"],
                  ["model", t("model")],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(event) =>
                      picker.setSettings((prev) => ({ ...prev, [key]: event.target.checked }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="ok-legend">
              <span>
                <i className="srgb" />
                sRGB
              </span>
              {settings.p3 && (
                <span>
                  <i className="p3" />
                  P3
                </span>
              )}
              {settings.rec2020 && (
                <span>
                  <i className="rec2020" />
                  Rec.2020
                </span>
              )}
            </div>
            <p className="ok-muted">{t("gamutNote")}</p>
          </Card>
          <details className="ok-help">
            <summary>{t("keyboard")}</summary>
            <p className="ok-shortcuts">{t("shortcuts")}</p>
          </details>
        </aside>
        <div className="ok-channels">
          {(["l", "c", "h", "alpha"] as const).map((channel) => (
            <ChannelCard
              key={channel}
              channel={channel}
              value={value}
              graphs={settings.graphs}
              p3={settings.p3}
              rec2020={settings.rec2020}
              onCommit={(next) => picker.commit(next)}
              onPreview={(next) => picker.preview(next)}
              onFinish={() => picker.finish()}
              language={language}
            />
          ))}
          {settings.model && (
            <Suspense fallback={<output className="ok-card">{t("loadingModel")}</output>}>
              <GamutModel
                key={`${value.mode}-${settings.p3}-${settings.rec2020}`}
                value={value}
                p3={settings.p3}
                rec2020={settings.rec2020}
                language={language}
              />
            </Suspense>
          )}
        </div>
      </div>
      <output className="ok-notice" aria-live="polite">
        {notice}
      </output>
    </div>
  );
};

const OklchPickerWithIntl = () => (
  <AppIntlProvider>
    <OklchPicker />
  </AppIntlProvider>
);

export default OklchPickerWithIntl;
