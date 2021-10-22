import { atomWithReset } from 'jotai/utils'

interface IColorPropsAtom {
  color: string;
}

const defaultValue: IColorPropsAtom = {
  color: '#112233'
}

export const mainAtom = atomWithReset(defaultValue)

const onReduceChangeColor = (prev: IColorPropsAtom, action: { type: 'change-color', color: string }) => {
  try {
    const next = { ...prev };
    next.color = action.color;

    return next;
   } catch {
    return prev;
  }
}

export type TColorPropsReducerAction =
  | Parameters<typeof onReduceChangeColor>[1]

export const reducer = (prev: IColorPropsAtom, action?: TColorPropsReducerAction) => {
  if (action === undefined) {
    throw new Error('action missed');
  }

  if (action.type === 'change-color') {
    return onReduceChangeColor(prev, action)
  }

  throw new Error('action missed');
}


