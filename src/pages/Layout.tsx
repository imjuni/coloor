import styled from "@emotion/styled";
import { uiPrimaryUX } from "../design/color";

export const StyledDivPageBox = styled.div`
  width: 100vw;
  height: 100vh;
`;

export const StyledDivPageHeading = styled.div`
  width: 100vw;
  height: 60px;
  box-shadow: ${uiPrimaryUX.lighten(0.2).alpha(0.8).toString()} 0px 3px 8px;
`;

export const StyledDivPageBody = styled.div`
  width: 100vw;
  height: calc(100vh - 60px);
`;
