import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import i18n from './config'; // Initialize i18n
import { translationDetector, createMonitoredTranslation, runGlobalTranslationChecks } from './detector';

export type SupportedLanguage = 'ru' | 'ro';

interface EnhancedI18nContextType {
  t: (key: string, options?: any) => string;
  changeLanguage: (lng: SupportedLanguage) => Promise<void>;
  language: SupportedLanguage;
  ready: boolean;
  // Enhanced features
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | string) => string;
}

const EnhancedI18nContext = createContext<EnhancedI18nContextType | null>(null);

export const EnhancedI18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [i18nInstance, setI18nInstance] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ru');

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        // Используем уже импортированный config для инициализации i18n
        if (i18n.isInitialized) {
          setI18nInstance(i18n);
          setCurrentLanguage(i18n.language as SupportedLanguage);
          setIsInitialized(true);
        } else {
          if (import.meta.env.DEV) {
            console.log('waiting for i18n initialization');
          }
          const onInitialized = () => {
            if (import.meta.env.DEV) {
              console.log('i18n initialized, language:', i18n.language);
            }
            setI18nInstance(i18n);
            setCurrentLanguage(i18n.language as SupportedLanguage);
            setIsInitialized(true);

            // Запускаем глобальные проверки переводов
            if (import.meta.env.DEV) {
              setTimeout(() => runGlobalTranslationChecks(), 1000);
            }
            i18n.off('initialized', onInitialized);
          };
          i18n.on('initialized', onInitialized);
        }

        // Listen for language changes
        const onLanguageChanged = (lng: string) => {
          if (import.meta.env.DEV) {
            console.log('Language changed event received:', lng);
          }
          setCurrentLanguage(lng as SupportedLanguage);
        };
        i18n.on('languageChanged', onLanguageChanged);

        return () => {
          i18n.off('languageChanged', onLanguageChanged);
        };
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        // В случае ошибки всё равно показываем контент
        setIsInitialized(true);
      }
    };

    initializeI18n();
  }, []);

  // Всегда предоставляем контекст, даже во время загрузки
  return <I18nProviderWrapper i18nInstance={i18nInstance} isReady={isInitialized} currentLanguage={currentLanguage}>{children}</I18nProviderWrapper>;
};

const I18nProviderWrapper: React.FC<{
  i18nInstance: any;
  isReady: boolean;
  currentLanguage: SupportedLanguage;
  children: React.ReactNode
}> = ({ i18nInstance, isReady, currentLanguage, children }) => {

  // Create a safe wrapper for translation that doesn't break when i18n isn't ready
  const safeT = (key: string, options?: any) => {
    if (!i18nInstance || !isReady) {
      // Базовые переводы для критических элементов
      const basicTranslations: Record<string, string> = {
        'app.name': 'ServiceHub',
        'nav.catalog': 'Каталог',
        'nav.sign_in': 'Войти',
        'nav.dashboard': 'Личный кабинет',
        'nav.messages': 'Сообщения',
        'loading.translations': 'Загрузка переводов...',
        'nav.home': 'Главная',
        'nav.specialists': 'Специалисты',
        'nav.jobs': 'Заказы',
        'nav.services': 'Услуги',
        'nav.login': 'Войти',
        'hero.cta_primary': 'Заказать услугу',
        'feed.title': 'Лента заказов',
        'nav.how_it_works': 'Как это работает',
        'nav.how_it_works_description': 'Узнать больше о платформе',
        'nav.schedule': 'Расписание',
        'nav.new_order': 'Новый заказ',
        'nav.new_order_description': 'Создайте заказ за 3 минуты',
        'nav.catalog_specialists': 'Найти исполнителя',
        'nav.catalog_specialists_description': 'Каталог исполнителей',
        'nav.job_feed': 'Лента заказов',
        'nav.job_feed_description': 'Новые заказы для отклика',
        'nav.tenders': 'Тендеры',
        'nav.tenders_description': 'Заказы с дедлайном',
        'nav.login_account': 'Войти в аккаунт',
        'catalog.description': 'Поиск исполнителей по категориям'
      };

      const result = basicTranslations[key] || key;

      // Логируем использование fallback переводов
      if (import.meta.env.DEV && basicTranslations[key]) {
        translationDetector.logIssue({
          key,
          type: 'fallback',
          context: 'Using basic translation - i18n not ready'
        });
      }

      return result;
    }

    try {
      const result = i18nInstance.t(key, options);

      // Создаем мониторируемую версию перевода
      const monitoredT = createMonitoredTranslation((k, opts) => i18nInstance.t(k, opts));
      return monitoredT(key, options);
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return key;
    }
  };

  const handleChangeLanguage = async (lng: SupportedLanguage) => {
    if (import.meta.env.DEV) {
      console.log('Changing language to:', lng);
    }
    if (i18nInstance) {
      try {
        await i18nInstance.changeLanguage(lng);
        if (import.meta.env.DEV) {
          console.log('Language changed successfully to:', lng);
        }
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn('i18n instance not available, cannot change language');
      }
    }
  };

  // Enhanced formatting functions
  const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
    const locale = (i18nInstance?.language === 'ro') ? 'ro-RO' : 'ru-RU';
    return new Intl.NumberFormat(locale, options).format(num);
  };

  const formatCurrency = (amount: number, currency: string = 'RUB') => {
    const locale = (i18nInstance?.language === 'ro') ? 'ro-RO' : 'ru-RU';
    const currencyCode = (i18nInstance?.language === 'ro') ? 'MDL' : currency;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const locale = (i18nInstance?.language === 'ro') ? 'ro-RO' : 'ru-RU';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    }).format(dateObj);
  };

  const formatRelativeTime = (date: Date | string) => {
    const locale = (i18nInstance?.language === 'ro') ? 'ro-RO' : 'ru-RU';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return (i18nInstance?.language === 'ro')
        ? `acum ${diffInMinutes} ${diffInMinutes === 1 ? 'minut' : 'minute'}`
        : `${diffInMinutes} ${diffInMinutes === 1 ? 'минуту' : diffInMinutes < 5 ? 'минуты' : 'минут'} назад`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return (i18nInstance?.language === 'ro')
        ? `acum ${hours} ${hours === 1 ? 'oră' : 'ore'}`
        : `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
    } else {
      return formatDate(dateObj, { month: 'short', day: 'numeric' });
    }
  };

  const value: EnhancedI18nContextType = {
    t: safeT,
    changeLanguage: handleChangeLanguage,
    language: currentLanguage,
    ready: isReady && !!i18nInstance,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };

  // Always provide context
  return (
    <EnhancedI18nContext.Provider value={value}>
      {children}
    </EnhancedI18nContext.Provider>
  );
};

export const useEnhancedI18n = () => {
  const context = useContext(EnhancedI18nContext);
  if (!context) {
    throw new Error('useEnhancedI18n must be used within EnhancedI18nProvider');
  }
  return context;
};

// Export Trans component for advanced text formatting
export { Trans } from 'react-i18next';