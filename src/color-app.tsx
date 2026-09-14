import React from "react";
import Color from "./components/color";
import { AppIntlProvider } from "./i18n/provider";

const App: React.FC = () => (
  <AppIntlProvider>
    <Color />
  </AppIntlProvider>
);

export default App;
