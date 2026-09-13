import styled from "@emotion/styled";
import { adjustLightness, withAlpha } from "../utils/color";
import { uiPrimaryUX } from "../design/color";

export const StyledDivPageBox = styled.div`
  width: 100%;
`;

export const StyledDivPageHeading = styled.div`
  width: 100%;
  height: 60px;
  box-shadow: ${withAlpha(adjustLightness(uiPrimaryUX, 0.2), 0.8).toString()} 0px 3px 8px;
`;

export const StyledDivPageBody = styled.div`
  width: 100%;
`;
