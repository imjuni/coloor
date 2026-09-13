import React, { useEffect, useState } from "react";
import { Global, css } from "@emotion/react";
import emotionReset from "emotion-reset";
import korean from "./i18n/korean.json";
import english from "./i18n/english.json";
import { getLanguage, PREFERENCE_EVENT } from "./utils/preferences";
import { IntlProvider } from "react-intl";
import Color from "./components/color";

const App: React.FC = () => {
  const [language, setLanguage] = useState(getLanguage);
  useEffect(() => {
    const update = () => setLanguage(getLanguage());
    window.addEventListener(PREFERENCE_EVENT, update);
    return () => window.removeEventListener(PREFERENCE_EVENT, update);
  }, []);
  return (
    <IntlProvider
      messages={language === "ko" ? korean : english}
      locale={language}
      defaultLocale="ko"
    >
      <>
        <Global
          styles={css`
            ${emotionReset}

            *,
            *::after,
            *::before {
              box-sizing: border-box;
              -moz-osx-font-smoothing: grayscale;
              -webkit-font-smoothing: antialiased;
            }
          `}
        />
        <Color />
      </>
    </IntlProvider>
  );
};

export default App;
