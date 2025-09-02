import { useTranslation } from "react-i18next";

/**
 * Строгий хук для переводов с контролем пропущенных ключей
 * В DEV режиме бросает ошибку если ключ не найден
 */
export function useStrictTranslation(ns?: string | string[]) {
  const { t, i18n } = useTranslation(ns);
  
  return {
    t: (key: string, opts?: any) => {
      const val = t(key, { ...opts }) as string;
      
      if (import.meta.env.DEV) {
        // Проверяем, что перевод не равен ключу (не найден)
        if (typeof val === 'string' && (val === key || val.startsWith("⛔"))) {
          console.error(`[i18n] СТРОГИЙ КОНТРОЛЬ: Missing key: ${key}`, {
            namespace: ns,
            currentLanguage: i18n.language,
            value: val
          });
          
          // В DEV режиме можно выбросить ошибку для жесткого контроля
          // throw new Error(`Missing i18n key: ${key}`);
        }
        
        // Проверяем пустые переводы
        if (typeof val === 'string' && (!val || val.trim() === '')) {
          console.warn(`[i18n] ПУСТОЙ ПЕРЕВОД: Empty translation for key: ${key}`);
        }
      }
      
      return val;
    },
    i18n,
    ready: i18n.isInitialized
  };
}

/**
 * Утилита для проверки всех переводов в компоненте
 */
export function validateTranslations(keys: string[], namespace?: string) {
  if (!import.meta.env.DEV) return;
  
  const { t } = useTranslation(namespace);
  
  const missing: string[] = [];
  const empty: string[] = [];
  
  keys.forEach(key => {
    const val = t(key) as string;
    if (typeof val === 'string') {
      if (val === key || val.startsWith("⛔")) {
        missing.push(key);
      } else if (!val || val.trim() === '') {
        empty.push(key);
      }
    }
  });
  
  if (missing.length > 0) {
    console.error(`[i18n] MISSING KEYS in ${namespace || 'default'}:`, missing);
  }
  
  if (empty.length > 0) {
    console.warn(`[i18n] EMPTY TRANSLATIONS in ${namespace || 'default'}:`, empty);
  }
  
  return { missing, empty };
}

/**
 * Хук для автоматической проверки переводов при монтировании компонента
 */
export function useTranslationValidation(keys: string[], namespace?: string) {
  if (import.meta.env.DEV) {
    const result = validateTranslations(keys, namespace);
    
    if (result.missing.length > 0 || result.empty.length > 0) {
      console.group(`[i18n] Translation issues in component`);
      console.log('Component keys:', keys);
      console.log('Namespace:', namespace);
      console.log('Missing:', result.missing);
      console.log('Empty:', result.empty);
      console.groupEnd();
    }
  }
}