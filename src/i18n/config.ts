import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import translationRU from '../locales/ru.json';
import translationRO from '../locales/ro.json';

// the translations
const resources = {
  ru: {
    translation: translationRU as any
  },
  ro: {
    translation: translationRO as any
  }
};

const getStoredLanguage = (): string => {
  try {
    return localStorage.getItem('language') || 'ru';
  } catch {
    return 'ru';
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: getStoredLanguage(), // language to use
    fallbackLng: 'ru', // fallback language
    
    keySeparator: '.', // we use dots to separate keys
    
    interpolation: {
      escapeValue: false // react already does escaping
    },
    
    // Improved options
    returnEmptyString: false, // return key if translation is empty
    returnNull: false, // return key if translation is null
    returnObjects: true, // ВАЖНО: разрешаем объекты для вложенных структур
    
    // React-specific options
    react: {
      useSuspense: false, // we handle loading manually
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '', // what to return for empty nodes
      transSupportBasicHtmlNodes: true, // allow basic HTML tags
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'b', 'span'], // allowed HTML tags
    },
    
    // Debug in development
    debug: true, // Включаем debug для диагностики
    
    // Load path configuration
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
  });

// Save language to localStorage when it changes
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('language', lng);
  } catch {
    // Ignore localStorage errors
  }
});

export default i18n;