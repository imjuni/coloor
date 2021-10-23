import React from "react";
import { initializeIcons } from "@fluentui/font-icons-mdl2";
import { PartialTheme, ThemeProvider } from "@fluentui/react";
import korean from "./i18n/korean.json";
import { IntlProvider } from "react-intl";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Color from "./pages/Color";

const appTheme: PartialTheme = {
  palette: {},
};

const App: React.FC = () => {
  initializeIcons();

  return (
    <IntlProvider messages={korean} locale="ko" defaultLocale="ko">
      <ThemeProvider theme={appTheme}>
        <Router basename={process.env.PUBLIC_URL}>
          <Switch>
            <Route exact path="/" render={() => <Color />} />
          </Switch>
        </Router>
      </ThemeProvider>
    </IntlProvider>
  );
};

export default App;
