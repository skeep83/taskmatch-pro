import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Currency {
  id: string;
  code: string;
  name_en: string;
  name_ru?: string;
  name_ro?: string;
  symbol: string;
  exchange_rate: number;
  is_base: boolean;
  is_active: boolean;
  decimal_places: number;
}

export interface CurrencySettings {
  defaultCurrency: string;
  supportedCurrencies: string[];
  autoCurrencyDetection: boolean;
  currencyConversionEnabled: boolean;
}

export function useCurrency() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [settings, setSettings] = useState<CurrencySettings>({
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD'],
    autoCurrencyDetection: true,
    currencyConversionEnabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrencyData();
  }, []);

  const loadCurrencyData = async () => {
    try {
      // Load currencies
      const { data: currencyData } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('is_base', { ascending: false })
        .order('code');

      setCurrencies(currencyData || []);

      // Load settings
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['default_currency', 'supported_currencies', 'auto_currency_detection', 'currency_conversion_enabled']);

      if (settingsData) {
        const settingsMap = settingsData.reduce((acc, setting) => {
          acc[setting.key] = JSON.parse(setting.value);
          return acc;
        }, {} as Record<string, any>);

        setSettings({
          defaultCurrency: settingsMap.default_currency || 'USD',
          supportedCurrencies: settingsMap.supported_currencies || ['USD'],
          autoCurrencyDetection: settingsMap.auto_currency_detection !== false,
          currencyConversionEnabled: settingsMap.currency_conversion_enabled !== false,
        });
      }
    } catch (error) {
      console.error('Error loading currency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amountCents: number, currencyCode?: string) => {
    const currency = currencies.find(c => c.code === (currencyCode || settings.defaultCurrency)) 
      || currencies.find(c => c.is_base);
    
    if (!currency) {
      return `$${(amountCents / 100).toFixed(2)}`;
    }

    const amount = amountCents / 100;
    const decimalPlaces = currency.decimal_places || 2;
    
    // Молдавский лей отображается после суммы
    if (currency.code === 'MDL') {
      return `${amount.toFixed(decimalPlaces)} ${currency.symbol}`;
    }
    
    return `${currency.symbol}${amount.toFixed(decimalPlaces)}`;
  };

  const convertPrice = (amountCents: number, fromCurrency: string, toCurrency: string) => {
    if (!settings.currencyConversionEnabled || fromCurrency === toCurrency) {
      return amountCents;
    }

    const fromCurrencyData = currencies.find(c => c.code === fromCurrency);
    const toCurrencyData = currencies.find(c => c.code === toCurrency);

    if (!fromCurrencyData || !toCurrencyData) {
      return amountCents;
    }

    // Convert to base currency (USD) first, then to target currency
    const baseAmount = amountCents / fromCurrencyData.exchange_rate;
    const convertedAmount = baseAmount * toCurrencyData.exchange_rate;

    return Math.round(convertedAmount);
  };

  const getCurrency = (code: string) => {
    return currencies.find(c => c.code === code);
  };

  const getDefaultCurrency = () => {
    return currencies.find(c => c.code === settings.defaultCurrency) 
      || currencies.find(c => c.is_base);
  };

  const getSupportedCurrencies = () => {
    return currencies.filter(c => settings.supportedCurrencies.includes(c.code));
  };

  return {
    currencies,
    settings,
    loading,
    formatPrice,
    convertPrice,
    getCurrency,
    getDefaultCurrency,
    getSupportedCurrencies,
    reload: loadCurrencyData,
  };
}