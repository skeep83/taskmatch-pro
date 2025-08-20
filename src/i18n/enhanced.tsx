import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import './config'; // Initialize i18n

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
  const { t, i18n, ready } = useTranslation();
  const [isReady, setIsReady] = useState(ready);

  useEffect(() => {
    setIsReady(ready);
  }, [ready]);

  const changeLanguage = async (lng: SupportedLanguage) => {
    await i18n.changeLanguage(lng);
  };

  // Enhanced formatting functions
  const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
    const locale = i18n.language === 'ro' ? 'ro-RO' : 'ru-RU';
    return new Intl.NumberFormat(locale, options).format(num);
  };

  const formatCurrency = (amount: number, currency: string = 'RUB') => {
    const locale = i18n.language === 'ro' ? 'ro-RO' : 'ru-RU';
    const currencyCode = i18n.language === 'ro' ? 'MDL' : currency;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const locale = i18n.language === 'ro' ? 'ro-RO' : 'ru-RU';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    }).format(dateObj);
  };

  const formatRelativeTime = (date: Date | string) => {
    const locale = i18n.language === 'ro' ? 'ro-RO' : 'ru-RU';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return i18n.language === 'ro' 
        ? `acum ${diffInMinutes} ${diffInMinutes === 1 ? 'minut' : 'minute'}`
        : `${diffInMinutes} ${diffInMinutes === 1 ? 'минуту' : diffInMinutes < 5 ? 'минуты' : 'минут'} назад`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return i18n.language === 'ro'
        ? `acum ${hours} ${hours === 1 ? 'oră' : 'ore'}`
        : `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
    } else {
      return formatDate(dateObj, { month: 'short', day: 'numeric' });
    }
  };

  const value: EnhancedI18nContextType = {
    t,
    changeLanguage,
    language: i18n.language as SupportedLanguage,
    ready: isReady,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary/40 animate-spin mx-auto" style={{animationDuration: '1.5s'}}></div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">ServiceHub</h2>
          <p className="text-muted-foreground animate-pulse">
            {i18n.language === 'ro' ? 'Se încarcă traducerile...' : 'Загрузка переводов...'}
          </p>
        </div>
      </div>
    );
  }

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