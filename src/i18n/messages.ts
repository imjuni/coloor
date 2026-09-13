import { useEffect, useState } from "react";
import { getLanguage, PREFERENCE_EVENT } from "../utils/preferences";
import type { Language } from "../utils/preferences";

const messages = {
  en: {
    alpha: "Opacity",
    applyFallback: "Apply sRGB fallback",
    c: "Chroma",
    close: "Close",
    colorCode: "color code",
    colorSpace: "Color space",
    convertedCode: "Converted color code",
    copied: "Copied to the clipboard.",
    copy: "Copy",
    copyFailed: "Clipboard access was denied. Copy from the field or address bar instead.",
    copyLink: "Copy link",
    displayOk: "This color can be displayed on the current screen.",
    displayUnavailable:
      "This screen cannot reproduce the original color. Compare it with the sRGB fallback.",
    enlarge: "Enlarge",
    fallback: "sRGB fallback",
    figmaHint: "Set the Figma document color profile to Display P3.",
    format: "Output format",
    gamutMapped: "This output format uses a gamut-mapped sRGB value.",
    gamutNote:
      "The grid is outside the selected gamuts. Graph colors depend on your display capabilities.",
    graphError: "The graph could not be loaded. Use the slider below to adjust the color.",
    graphs: "Gamut graphs",
    h: "Hue",
    intro: "Adjust lightness, chroma, and hue independently.",
    invalidColor: "Enter a valid CSS color. The last valid color is preserved.",
    keyboard: "Keyboard controls",
    l: "Lightness",
    loadingModel: "Preparing the 3D model…",
    model: "gamut model",
    modelAria: "3D gamut. Use arrow keys to rotate, plus and minus to zoom, and Home to reset.",
    modelError: "The 3D model could not be loaded.",
    modelHelp: "Drag to rotate · Scroll to zoom · Shift+drag to pan",
    modelLoading: "Calculating gamut surfaces…",
    numericError: "Enter a number or expression in the range.",
    numericHint: "Arithmetic supported. Shift+Up/Down for fine adjustment",
    opacity: "opacity",
    pasteHint: "Paste HEX, RGB, HSL, or a CSS color name and press Enter.",
    redo: "Redo",
    resetView: "Reset view",
    selected: "Selected",
    settings: "Display settings",
    shortcuts:
      "L / C / H / A: focus a channel\nO / R: focus a color code\nArrow keys: adjust a value or graph\nShift + arrow: fine adjustment\nCtrl / ⌘ + Z: undo\nNumeric fields accept arithmetic",
    sidebar: "Color input and settings",
    slider: "slider",
    tagline: "Color, with more precision.",
    undo: "Undo",
    value: "value",
    xHue: "Hue H",
    xLightness: "Lightness L",
    yChroma: "Chroma C",
    yLightness: "Lightness L",
    zoom: "Zoom",
  },
  ko: {
    alpha: "불투명도",
    applyFallback: "sRGB 대체 색상 적용",
    c: "채도",
    close: "닫기",
    colorCode: "색상 코드",
    colorSpace: "색상 공간",
    convertedCode: "변환 색상 코드",
    copied: "클립보드에 복사했습니다.",
    copy: "복사",
    copyFailed: "복사 권한이 없습니다. 입력칸이나 주소창에서 직접 복사해 주세요.",
    copyLink: "링크 복사",
    displayOk: "현재 화면에서 표시할 수 있는 색상입니다.",
    displayUnavailable:
      "이 화면에서 원색을 정확히 표시할 수 없습니다. sRGB 대체 색상과 비교하세요.",
    enlarge: "크게 보기",
    fallback: "sRGB 대체 색상",
    figmaHint: "Figma 문서의 색상 프로필을 Display P3로 설정하세요.",
    format: "변환 형식",
    gamutMapped: "선택한 출력 형식에는 sRGB 색역으로 보정한 값을 사용합니다.",
    gamutNote:
      "격자 영역은 선택한 색역 밖입니다. 그래프의 색은 화면의 표시 범위에 따라 달라질 수 있습니다.",
    graphError: "그래프를 불러오지 못했습니다. 아래 슬라이더로 색상을 조절할 수 있습니다.",
    graphs: "색역 그래프",
    h: "색상각",
    intro: "빛의 밝기, 색의 선명함, 색상각을 따로 조절하세요.",
    invalidColor: "올바른 CSS 색상을 입력하세요. 마지막 유효 색상은 유지됩니다.",
    keyboard: "키보드로 조절하기",
    l: "명도",
    loadingModel: "3D 모델을 준비하고 있습니다…",
    model: "색역 모델",
    modelAria: "3D 색역. 방향키로 회전, 더하기와 빼기로 확대·축소, Home으로 초기화.",
    modelError: "3D 모델을 불러오지 못했습니다.",
    modelHelp: "드래그로 회전 · 스크롤로 확대 · Shift+드래그로 이동",
    modelLoading: "색역 모델을 계산하고 있습니다…",
    numericError: "범위의 숫자나 수식을 입력하세요.",
    numericHint: "사칙연산 입력 가능. Shift+위/아래 방향키로 미세 조절",
    opacity: "불투명도",
    pasteHint: "HEX, RGB, HSL, CSS 색상 이름을 붙여 넣고 Enter를 누르세요.",
    redo: "다시 실행",
    resetView: "시점 초기화",
    selected: "선택 색상",
    settings: "보기 설정",
    shortcuts:
      "L / C / H / A: 채널 선택\nO / R: 색상 코드 선택\n방향키: 값 또는 그래프 조절\nShift + 방향키: 미세 조절\nCtrl / ⌘ + Z: 실행 취소\n숫자 입력칸에서 사칙연산 가능",
    sidebar: "색상 입력 및 설정",
    slider: "슬라이더",
    tagline: "색상을 더 정확하게.",
    undo: "실행 취소",
    value: "값",
    xHue: "색상각 H",
    xLightness: "명도 L",
    yChroma: "채도 C",
    yLightness: "명도 L",
    zoom: "확대",
  },
} as const;

export type MessageKey = keyof typeof messages.ko;
export const translate = (language: Language, key: MessageKey): string => messages[language][key];

export const useLanguage = (): Language => {
  const [language, setLanguage] = useState<Language>(getLanguage);
  useEffect(() => {
    const update = () => setLanguage(getLanguage());
    window.addEventListener(PREFERENCE_EVENT, update);
    return () => window.removeEventListener(PREFERENCE_EVENT, update);
  }, []);
  return language;
};
