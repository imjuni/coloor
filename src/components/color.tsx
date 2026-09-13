import * as ReactColor from "react-color";
import { useIntl } from "react-intl";
import styled from "@emotion/styled";
import { StyledDivPageBody, StyledDivPageBox, StyledDivPageHeading } from "./layout";
import { uiPrimaryFont, uiPrimaryInvertFont, uiPrimaryUX } from "../design/color";
import { mainAtom, reducer as mainReducer } from "../atom/color";
import { useReducerAtom } from "jotai/utils";
import ColorValue from "colorjs.io";
import { adjustLightness, toHex, toRgbChannels } from "../utils/color";
import { bignumber } from "mathjs";
const SHADE_LEVELS = Array.from({ length: 10 }, (_, index) => index);
const reactColorModule = ReactColor as typeof ReactColor & { default?: typeof ReactColor };
const SketchPicker = reactColorModule.SketchPicker ?? reactColorModule.default?.SketchPicker;

if (!SketchPicker) {
  throw new Error("SketchPicker is unavailable");
}

const StyledStackHeading = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  background-color: ${uiPrimaryUX.toString()};
  justify-content: center;
  padding-left: 2em;

  h1 {
    color: ${adjustLightness(uiPrimaryUX, 0.7).toString()};
    font-size: 28px;
    font-weight: 400;
  }
`;

const StyledStackBox = styled.div`
  display: flex;
  padding: 2em;
  justify-content: center;
  z-index: 100;

  @media screen and (min-width: 769px) {
    flex-direction: row;
  }

  @media screen and (max-width: 768px) {
    flex-direction: column;
  }
`;

const StyledStackShadeBox = styled.div`
  display: flex;
  padding: 2em;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1em;

  .lighten-shade {
    width: 250px;
    box-shadow: rgb(0 0 0 / 15%) 0px 3px 12px;
    border-radius: 5px;
  }

  .darken-shade {
    width: 250px;
    box-shadow: rgb(0 0 0 / 15%) 0px 3px 12px;
    border-radius: 5px;
  }

  .lighten-shade,
  .darken-shade {
    align-content: center;

    .shade {
      display: flex;

      .shade-morder {
        display: flex;
        width: 6em;
        padding-left: 1em;
        align-items: flex-start;
      }

      .shade-hex {
        display: flex;
        flex: 1;
      }

      .shade-morder,
      .shade-hex {
        justify-content: center;
      }

      height: 40px;
    }
  }
`;

const StyledStackColorPickerBox = styled.div`
  display: flex;
  @media screen and (min-width: 769px) {
    margin-right: 2em;
    margin-bottom: 0;
  }

  @media screen and (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 2em;
  }

  .picker-widget {
    width: min(300px, calc(100vw - 4em)) !important;
  }
`;

const StyledStackColorResultBox = styled.div`
  display: flex;
  align-items: center;

  .color-display-panel {
    display: flex;
    justify-content: center;
    width: min(300px, calc(100vw - 4em));
    height: 300px;
    box-shadow: rgb(0 0 0 / 15%) 0px 3px 12px;
    border-radius: 5px;
    padding-top: 2em;
  }
`;

const useColorPropsBootstrap = () => {
  const [state, dispatch] = useReducerAtom(mainAtom, mainReducer);

  return { dispatch, state };
};

const calculateFontColor = (pickedColor: string) => {
  const [r, g, b] = toRgbChannels(new ColorValue(pickedColor));
  const red = bignumber(r).mul(bignumber(0.299));
  const green = bignumber(g).mul(bignumber(0.587));
  const blue = bignumber(b).mul(bignumber(0.114));
  const sum = red.plus(green).plus(blue);

  return sum.toNumber() > 186 ? uiPrimaryFont.toString() : uiPrimaryInvertFont.toString();
};

const Color: React.FC = () => {
  const intl = useIntl();
  const { state, dispatch } = useColorPropsBootstrap();

  return (
    <StyledDivPageBox>
      <StyledDivPageHeading>
        <StyledStackHeading>
          <h1>
            {intl.formatMessage({ id: "color.heading" })}
          </h1>
        </StyledStackHeading>
      </StyledDivPageHeading>

      <StyledDivPageBody>
        <StyledStackBox className="picker-box">
          <StyledStackColorPickerBox>
            <SketchPicker
              className="picker-widget"
              color={state.color}
              onChange={(pickedColor) => dispatch({ color: pickedColor.hex, type: "change-color" })}
            />
          </StyledStackColorPickerBox>

          <StyledStackColorResultBox>
            <div className="color-display-panel" style={{ backgroundColor: `${state.color}` }}>
              <span
                style={{
                  color: calculateFontColor(state.color),
                  textAlign: "center",
                }}
              >
                {state.color}
              </span>
            </div>
          </StyledStackColorResultBox>
        </StyledStackBox>

        <StyledStackShadeBox>
          {["lighten-shade", "darken-shade"].map((stackClassName) => (
            <div key={stackClassName} className={stackClassName}>
              {SHADE_LEVELS.map((index) => {
                const base = new ColorValue(state.color);
                const morder = bignumber(index).mul(bignumber(0.05));
                const processed =
                  stackClassName === "lighten-shade"
                    ? adjustLightness(base, morder.toNumber())
                    : adjustLightness(base, -morder.toNumber());
                return (
                  <div
                    key={index}
                    className="shade"
                    style={{ backgroundColor: processed.toString() }}
                    onClick={() => {
                      dispatch({
                        color: toHex(processed),
                        type: "change-color",
                      });
                    }}
                  >
                    <div className="shade-morder">
                      <span
                        style={{
                          color: calculateFontColor(toHex(processed)),
                          textAlign: "center",
                        }}
                      >
                        {morder.mul(100).toString()}% - {morder.toString()}
                      </span>
                    </div>
                    <div className="shade-hex">
                      <span
                        style={{
                          color: calculateFontColor(toHex(processed)),
                          textAlign: "center",
                        }}
                      >
                        {toHex(processed)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </StyledStackShadeBox>
      </StyledDivPageBody>
    </StyledDivPageBox>
  );
};

export default Color;
