import { uiPrimaryUX } from "../design/color";
import { toHex } from "../utils/color";
import { atomWithReset } from "jotai/utils";

interface IColorPropsAtom {
  color: string;
}

const defaultValue: IColorPropsAtom = {
  color: toHex(uiPrimaryUX),
};

export const mainAtom = atomWithReset(defaultValue);

const onReduceChangeColor = (
  prev: IColorPropsAtom,
  action: { type: "change-color"; color: string },
) => {
  try {
    const next = { ...prev, color: action.color };

    return next;
  } catch {
    return prev;
  }
};

export type TColorPropsReducerAction = Parameters<typeof onReduceChangeColor>[1];

export const reducer = (prev: IColorPropsAtom, action?: TColorPropsReducerAction) => {
  if (action === undefined) {
    throw new Error("action missed");
  }

  if (action.type === "change-color") {
    return onReduceChangeColor(prev, action);
  }

  throw new Error("action missed");
};
