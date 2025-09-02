import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedI18n } from './enhanced';
import { useTranslation } from 'react-i18next';

interface DatabaseTranslation {
  id: string;
  key: string;
  value: string;
  language_code: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to load and sync translations from database
 */
export const useDatabaseTranslations = () => {
  const { language } = useEnhancedI18n();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadTranslations = async (forceReload = false) => {
    if (loading && !forceReload) return;
    
    setLoading(true);
    try {
      // Load translations for current language
      const { data: translations, error } = await supabase
        .from('translations')
        .select('key, value')
        .eq('language_code', language);

      if (error) {
        console.error('Failed to load translations:', error);
        return;
      }

      if (translations && translations.length > 0) {
        // Convert to i18next format
        const translationObject: Record<string, any> = {};
        
        translations.forEach((translation) => {
          // Support nested keys like "nav.find_pro"
          const keys = translation.key.split('.');
          let current = translationObject;
          
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }
          
          current[keys[keys.length - 1]] = translation.value;
        });

        // Add to i18n resources
        i18n.addResourceBundle(language, 'translation', translationObject, true, true);
        
        setLastSync(new Date());
        console.log(`Loaded ${translations.length} translations for ${language}`);
      }
    } catch (error) {
      console.error('Error loading database translations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load translations when language changes
  useEffect(() => {
    loadTranslations();
  }, [language]);

  // Set up real-time subscription for translation updates
  useEffect(() => {
    const channel = supabase
      .channel('translations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations',
          filter: `language_code=eq.${language}`,
        },
        () => {
          console.log('Translation updated, reloading...');
          loadTranslations(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [language]);

  return {
    loading,
    lastSync,
    reloadTranslations: () => loadTranslations(true),
  };
};

/**
 * Component to automatically sync database translations
 */
export const DatabaseI18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { loading } = useDatabaseTranslations();

  return (
    <>
      {children}
      {loading && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-white px-3 py-2 rounded-lg text-sm">
          Обновление переводов...
        </div>
      )}
    </>
  );
};