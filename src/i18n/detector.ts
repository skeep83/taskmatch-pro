/**
 * Детектор и валидатор переводов для runtime проверки
 */

import { useEffect } from 'react';
import { useEnhancedI18n } from './enhanced';

interface TranslationIssue {
  key: string;
  type: 'missing' | 'empty' | 'fallback';
  context?: string;
}

class TranslationDetector {
  private issues: TranslationIssue[] = [];
  private reportedKeys = new Set<string>();

  logIssue(issue: TranslationIssue) {
    if (!import.meta.env.DEV) return;
    
    const issueKey = `${issue.key}-${issue.type}`;
    if (this.reportedKeys.has(issueKey)) return;
    
    this.reportedKeys.add(issueKey);
    this.issues.push(issue);
    
    switch (issue.type) {
      case 'missing':
        console.error(`🔴 [i18n] MISSING: ${issue.key}`, issue.context);
        break;
      case 'empty':
        console.warn(`🟡 [i18n] EMPTY: ${issue.key}`, issue.context);
        break;
      case 'fallback':
        console.info(`🔵 [i18n] FALLBACK: ${issue.key}`, issue.context);
        break;
    }
  }

  getIssues(): TranslationIssue[] {
    return [...this.issues];
  }

  clearIssues() {
    this.issues = [];
    this.reportedKeys.clear();
  }

  generateReport() {
    if (!import.meta.env.DEV || this.issues.length === 0) return;
    
    console.group('📊 [i18n] Translation Issues Report');
    
    const byType = this.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Summary:', byType);
    console.log('Total issues:', this.issues.length);
    console.log('Issues by key:');
    
    this.issues.forEach(issue => {
      console.log(`  ${issue.type.toUpperCase()}: ${issue.key}`);
    });
    
    console.groupEnd();
  }
}

export const translationDetector = new TranslationDetector();

/**
 * Хук для мониторинга переводов в компоненте
 */
export function useTranslationMonitoring(componentName?: string) {
  const { ready, language } = useEnhancedI18n();
  
  useEffect(() => {
    if (!import.meta.env.DEV || !ready) return;
    
    const componentContext = componentName || 'Unknown Component';
    console.log(`🔍 [i18n] Monitoring translations in: ${componentContext} (${language})`);
    
    // Очищаем отчет при смене языка
    return () => {
      if (componentName === 'App') {
        // Генерируем отчет только для корневого компонента
        setTimeout(() => translationDetector.generateReport(), 1000);
      }
    };
  }, [language, ready, componentName]);
}

/**
 * Обертка для t() с автоматическим детектированием проблем
 */
export function createMonitoredTranslation(t: (key: string, options?: any) => string) {
  return (key: string, options?: any) => {
    const result = t(key, options);
    
    if (import.meta.env.DEV) {
      // Проверяем на отсутствующие ключи
      if (result === key) {
        translationDetector.logIssue({
          key,
          type: 'missing',
          context: options ? JSON.stringify(options) : undefined
        });
      }
      
      // Проверяем на символ ошибки
      if (typeof result === 'string' && result.startsWith('⛔')) {
        translationDetector.logIssue({
          key,
          type: 'missing',
          context: 'Error symbol detected'
        });
      }
      
      // Проверяем на пустые переводы
      if (typeof result === 'string' && result.trim() === '') {
        translationDetector.logIssue({
          key,
          type: 'empty'
        });
      }
    }
    
    return result;
  };
}

/**
 * Глобальные проверки при загрузке приложения
 */
export function runGlobalTranslationChecks() {
  if (!import.meta.env.DEV) return;
  
  console.log('🚀 [i18n] Running global translation checks...');
  
  // Проверяем доступные языки
  const availableLanguages = ['ru', 'ro'];
  console.log('Available languages:', availableLanguages);
  
  // Проверяем критические ключи
  const criticalKeys = [
    'app.name',
    'nav.sign_in',
    'nav.dashboard',
    'common.loading',
    'common.error'
  ];
  
  console.log('Checking critical keys:', criticalKeys);
  
  // Можно добавить дополнительные проверки
  setTimeout(() => {
    translationDetector.generateReport();
  }, 5000);
}