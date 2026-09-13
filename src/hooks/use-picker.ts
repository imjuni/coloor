import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { colorFromUrl, colorHash, DEFAULT_COLOR, FORMATS, historyReducer } from "../utils/oklch";
import type { OutputFormat, PickerColor } from "../utils/oklch";

export interface PickerSettings {
  graphs: boolean;
  p3: boolean;
  rec2020: boolean;
  model: boolean;
  format: OutputFormat;
}
const defaults: PickerSettings = {
  format: "auto",
  graphs: true,
  model: false,
  p3: true,
  rec2020: false,
};
const SETTINGS_KEY = "coloor:oklch:settings:v1";
const readSettings = (): PickerSettings => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    return {
      format: Object.hasOwn(FORMATS, saved.format) ? saved.format : "auto",
      graphs: typeof saved.graphs === "boolean" ? saved.graphs : true,
      model: saved.model === true,
      p3: typeof saved.p3 === "boolean" ? saved.p3 : true,
      rec2020: saved.rec2020 === true,
    };
  } catch {
    return defaults;
  }
};
const initialColor = (): PickerColor => {
  const url = new URL(location.href);
  return (
    colorFromUrl(url) ?? {
      ...DEFAULT_COLOR,
      ...(url.searchParams.get("space") === "lch" ? { c: 40, l: 65, mode: "lch" as const } : {}),
    }
  );
};

export const usePicker = () => {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    future: [],
    past: [],
    present: initialColor(),
  }));
  const [draft, setDraft] = useState<PickerColor | null>(null);
  const draftRef = useRef<PickerColor | null>(null);
  const [settings, setSettings] = useState(readSettings);
  const value = draft ?? history.present;
  const commit = useCallback((next: PickerColor) => {
    draftRef.current = null;
    setDraft(null);
    dispatch({ type: "set", value: next });
  }, []);
  const preview = useCallback((next: PickerColor) => {
    draftRef.current = next;
    setDraft(next);
  }, []);
  const finish = useCallback(() => {
    if (draftRef.current) {
      commit(draftRef.current);
    }
  }, [commit]);
  const undo = useCallback(() => {
    draftRef.current = null;
    setDraft(null);
    dispatch({ type: "undo" });
  }, []);
  const redo = useCallback(() => {
    draftRef.current = null;
    setDraft(null);
    dispatch({ type: "redo" });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* Settings remain usable when browser storage is blocked. */
    }
  }, [settings]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const url = new URL(location.href);
      url.hash = colorHash(value);
      if (value.mode === "lch") {
        url.searchParams.set("space", "lch");
      } else {
        url.searchParams.delete("space");
      }
      if (url.href !== location.href) {
        window.history.replaceState(null, "", url);
      }
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [value]);
  useEffect(() => {
    const restore = () => {
      const parsed = colorFromUrl(new URL(location.href));
      if (parsed) {
        commit(parsed);
      }
    };
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, [commit]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const { target } = event;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches("input,textarea,select"))
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && (key === "z" || key === "y")) {
        event.preventDefault();
        if (key === "y" || event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        ["l", "c", "h", "a", "o", "r"].includes(key)
      ) {
        const input = document.querySelector<HTMLInputElement>(`[data-color-key="${key}"]`);
        if (input) {
          event.preventDefault();
          input.focus();
          input.select();
        }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [redo, undo]);
  return {
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    commit,
    finish,
    preview,
    redo,
    setSettings,
    settings,
    undo,
    value,
  };
};
