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

const getStoredLocale = (): Locale => {
  try {
    return (localStorage.getItem("locale") as Locale) || "ru";
  } catch {
    return "ru";
  }
};

const setStoredLocale = (locale: Locale) => {
  try {
    localStorage.setItem("locale", locale);
  } catch {
    // Ignore localStorage errors
  }
};

export const I18nProvider: React.FC<{ initialLocale?: Locale; children: React.ReactNode }> = ({
  initialLocale = getStoredLocale(),
  children,
}) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Dict>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    loadDict(locale)
      .then((loadedDict) => {
        setDict(loadedDict);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load translations:', error);
        // Fallback to empty dict to prevent crashes
        setDict({});
        setIsLoading(false);
      });
  }, [locale]);

  const setLocale = (l: Locale) => {
    setStoredLocale(l);
    setLocaleState(l);
  };

  const t = useMemo(() => (key: string) => dict[key] ?? key, [dict]);

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale]);

  // Show loading screen while translations are loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary/40 animate-spin mx-auto" style={{animationDuration: '1.5s'}}></div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">ServiceHub</h2>
          <p className="text-muted-foreground animate-pulse">{dict["loading.translations"] || "Загрузка переводов..."}</p>
        </div>
      </div>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
