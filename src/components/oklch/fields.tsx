import { useState } from "react";
import { calculateChannel, round } from "../../utils/oklch";
import { translate } from "../../i18n/messages";
import type { Language } from "../../utils/preferences";

interface NumberFieldProps {
  label: string;
  shortcut: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  language: Language;
}
export const NumberField = ({
  label,
  shortcut,
  value,
  min,
  max,
  step,
  onChange,
  language,
}: NumberFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const commit = () => {
    if (draft === null) {
      return;
    }
    const parsed = calculateChannel(draft);
    if (parsed === null || parsed < min || parsed > max) {
      setError(true);
      return;
    }
    setError(false);
    setDraft(null);
    onChange(parsed);
  };
  return (
    <label className="ok-number">
      <span className="sr-only">{label}</span>
      <kbd>{shortcut.toUpperCase()}</kbd>
      <input
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={draft === null ? value : undefined}
        aria-valuetext={draft ?? undefined}
        aria-invalid={error}
        data-color-key={shortcut}
        value={draft ?? round(value)}
        title={`${min}–${max}. ${translate(language, "numericHint")}`}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(false);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(null);
            setError(false);
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const base = draft === null ? value : calculateChannel(draft);
            if (base === null) {
              setError(true);
              return;
            }
            const next = Math.min(
              max,
              Math.max(
                min,
                base + step * (event.shiftKey ? 0.1 : 1) * (event.key === "ArrowUp" ? 1 : -1),
              ),
            );
            setDraft(null);
            setError(false);
            onChange(Number(next.toFixed(7)));
          }
        }}
      />
      {error && (
        <small role="alert">
          {min}–{max} {translate(language, "numericError")}
        </small>
      )}
    </label>
  );
};

interface CodeFieldProps {
  label: string;
  code: string;
  shortcut: string;
  onCommit: (text: string) => boolean;
  onCopy: (text: string) => void;
  language: Language;
}
export const CodeField = ({
  label,
  code,
  shortcut,
  onCommit,
  onCopy,
  language,
}: CodeFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const commit = () => {
    if (draft === null) {
      return;
    }
    if (onCommit(draft)) {
      setDraft(null);
      setError(false);
    } else {
      setError(true);
    }
  };
  return (
    <div className="ok-code">
      <label htmlFor={`color-code-${shortcut}`}>{label}</label>
      <div className="ok-code-row">
        <input
          id={`color-code-${shortcut}`}
          data-color-key={shortcut}
          spellCheck={false}
          autoComplete="off"
          value={draft ?? code}
          aria-invalid={error}
          aria-describedby={error ? `color-error-${shortcut}` : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(false);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(null);
              setError(false);
            }
          }}
        />
        <button
          type="button"
          aria-label={`${label} ${translate(language, "copy")}`}
          onClick={() => onCopy(code)}
        >
          {translate(language, "copy")}
        </button>
      </div>
      {error && (
        <p className="ok-error" id={`color-error-${shortcut}`} role="alert">
          {translate(language, "invalidColor")}
        </p>
      )}
    </div>
  );
};
