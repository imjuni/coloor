import { Text, Stack } from "@fluentui/react";
import { SketchPicker } from "react-color";
import { useIntl } from "react-intl";
import styled from "@emotion/styled";
import {
  StyledDivPageBody,
  StyledDivPageBox,
  StyledDivPageHeading,
} from "./Layout";
import {
  uiPrimaryFont,
  uiPrimaryInvertFont,
  uiPrimaryUX,
} from "../design/color";
import { mainAtom, reducer as mainReducer } from "../atom/color";
import { useReducerAtom } from "jotai/utils";
import color from "color";
import { bignumber } from "mathjs";
import { populate } from "my-easy-fp";
import { nanoid } from "nanoid";

const StyledStackHeading = styled(Stack)`
  width: 100%;
  height: 100%;
  background-color: ${uiPrimaryUX.toString()};
  justify-content: center;
  padding-left: 2em;

  h1 {
    color: ${uiPrimaryUX.lighten(0.7).toString()};
  }
`;

const StyledStackBox = styled(Stack)`
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

const StyledStackShadeBox = styled(Stack)`
  padding: 2em;
  justify-content: center;

  .lighten-shade {
    width: 250px;
    box-shadow: rgb(0 0 0 / 15%) 0px 3px 12px;
    border-radius: 5px;
    margin-right: 1em;
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
      .shade-morder {
        width: 6em;
        padding-left: 1em;
        align-items: flex-start;
      }

      .shade-hex {
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

const StyledStackColorPickerBox = styled(Stack)`
  @media screen and (min-width: 769px) {
    margin-right: 2em;
    margin-bottom: 0;
  }

  @media screen and (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 2em;
  }

  .picker-widget {
    width: 300px !important;
  }
`;

const StyledStackColorResultBox = styled(Stack)`
  align-items: center;

  .color-display-panel {
    width: 300px;
    height: 300px;
    box-shadow: rgb(0 0 0 / 15%) 0px 3px 12px;
    border-radius: 5px;
    padding-top: 2em;
  }
`;

const useColorPropsBootstrap = () => {
  const [state, dispatch] = useReducerAtom(mainAtom, mainReducer);

  return { state, dispatch };
};

const Color: React.FC = () => {
  const intl = useIntl();
  const shadeLevel = 10;
  const { state, dispatch } = useColorPropsBootstrap();

  const onHandleCalculateFontColor = (pickedColor: string) => {
    // https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
    // if (red*0.299 + green*0.587 + blue*0.114) > 186 use #000000 else use #ffffff

    const choosed = color(pickedColor);

    const red = bignumber(choosed.red()).mul(bignumber(0.299));
    const green = bignumber(choosed.green()).mul(bignumber(0.587));
    const blue = bignumber(choosed.blue()).mul(bignumber(0.114));
    const sum = red.plus(green).plus(blue);

    if (sum.toNumber() > 186) {
      return uiPrimaryFont.toString(); // black
    } else {
      return uiPrimaryInvertFont.toString(); // white
    }
  };

  return (
    <StyledDivPageBox>
      <StyledDivPageHeading>
        <StyledStackHeading>
          <Text as="h1" variant="xxLarge">
            {intl.formatMessage({ id: "color.heading" })}
          </Text>
        </StyledStackHeading>
      </StyledDivPageHeading>

      <StyledDivPageBody>
        <StyledStackBox className="picker-box">
          <StyledStackColorPickerBox>
            <SketchPicker
              className="picker-widget"
              color={state.color}
              onChange={(color) =>
                dispatch({ type: "change-color", color: color.hex })
              }
            />
          </StyledStackColorPickerBox>

          <StyledStackColorResultBox>
            <Stack
              className="color-display-panel"
              style={{ backgroundColor: `${state.color}` }}
            >
              <Text
                as="span"
                variant="xxLarge"
                style={{
                  color: onHandleCalculateFontColor(state.color),
                  textAlign: "center",
                }}
              >
                {state.color}
              </Text>
            </Stack>
          </StyledStackColorResultBox>
        </StyledStackBox>

        <StyledStackShadeBox horizontal>
          {["lighten-shade", "darken-shade"].map(
            (stackClassName, classNameIndex) => {
              return (
                <Stack key={nanoid(classNameIndex)} className={stackClassName}>
                  {populate(shadeLevel).map((index) => {
                    const base = color(state.color);
                    const morder = bignumber(index).mul(bignumber(0.05));
                    const processed =
                      stackClassName === "lighten-shade"
                        ? base.lighten(morder.toNumber())
                        : base.darken(morder.toNumber());
                    return (
                      <Stack
                        key={nanoid(index)}
                        className="shade"
                        style={{ backgroundColor: processed.toString() }}
                        horizontal
                        onClick={() => {
                          dispatch({
                            type: "change-color",
                            color: processed.hex(),
                          });
                        }}
                      >
                        <Stack className="shade-morder">
                          <Text
                            as="span"
                            variant="medium"
                            style={{
                              textAlign: "center",
                              color: onHandleCalculateFontColor(
                                processed.hex()
                              ),
                            }}
                          >
                            {morder.mul(100).toString()}% - {morder.toString()}
                          </Text>
                        </Stack>
                        <Stack className="shade-hex">
                          <Text
                            as="span"
                            variant="medium"
                            style={{
                              textAlign: "center",
                              color: onHandleCalculateFontColor(
                                processed.hex()
                              ),
                            }}
                          >
                            {processed.hex()}
                          </Text>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              );
            }
          )}
        </StyledStackShadeBox>
      </StyledDivPageBody>
    </StyledDivPageBox>
  );
};

export default Color;
