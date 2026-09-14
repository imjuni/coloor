import { useEffect, useState } from "react";
import { IntlProvider } from "react-intl";
import english from "./english.json";
import korean from "./korean.json";
import { getLanguage, PREFERENCE_EVENT } from "../utils/preferences";
import type { PropsWithChildren } from "react";

const messages = { en: english, ko: korean } as const;

export const AppIntlProvider = ({ children }: PropsWithChildren) => {
  const [locale, setLocale] = useState(getLanguage);

  useEffect(() => {
    const updateLocale = () => setLocale(getLanguage());
    window.addEventListener(PREFERENCE_EVENT, updateLocale);
    return () => window.removeEventListener(PREFERENCE_EVENT, updateLocale);
  }, []);

  return (
    <IntlProvider defaultLocale="ko" locale={locale} messages={messages[locale]}>
      {children}
    </IntlProvider>
  );
};
