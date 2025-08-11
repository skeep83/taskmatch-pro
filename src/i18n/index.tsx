import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

export type Locale = "ru" | "ro";

type Dict = Record<string, string>;

type I18nContextType = {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const loadDict = async (locale: Locale): Promise<Dict> => {
  switch (locale) {
    case "ro":
      return (await import("../locales/ro.json")).default as Dict;
    case "ru":
    default:
      return (await import("../locales/ru.json")).default as Dict;
  }
};

export const I18nProvider: React.FC<{ initialLocale?: Locale; children: React.ReactNode }> = ({
  initialLocale = (localStorage.getItem("locale") as Locale) || "ru",
  children,
}) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Dict>({});

  useEffect(() => {
    loadDict(locale).then(setDict);
  }, [locale]);

  const setLocale = (l: Locale) => {
    localStorage.setItem("locale", l);
    setLocaleState(l);
  };

  const t = useMemo(() => (key: string) => dict[key] ?? key, [dict]);

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
