# Отладка и контроль переводов в ServiceHub

## 🚀 Включена система жесткого контроля переводов!

Система автоматически отслеживает и логирует все проблемы с переводами в режиме разработки.

## 📊 Виды проверок

### 1. **Автоматическое обнаружение пропущенных ключей**
```javascript
// В консоли увидите:
// 🔴 [i18n] MISSING: some.missing.key
// ⛔ some.missing.key - в UI
```

### 2. **Детекция пустых переводов**
```javascript
// 🟡 [i18n] EMPTY: some.empty.key
```

### 3. **Мониторинг fallback переводов**
```javascript
// 🔵 [i18n] FALLBACK: nav.catalog (Using basic translation)
```

## 🛠 Инструменты

### Строгий хук для критических компонентов
```typescript
import { useStrictTranslation } from '@/i18n/strictTranslation';

function PaymentComponent() {
  const { t } = useStrictTranslation(['payment', 'common']);
  
  // Выбросит ошибку в DEV если ключ не найден
  return <button>{t('payment.submit')}</button>;
}
```

### Валидация переводов в компоненте
```typescript
import { useTranslationValidation } from '@/i18n/strictTranslation';

function MyComponent() {
  // Автоматически проверит все ключи при монтировании
  useTranslationValidation([
    'nav.home',
    'nav.catalog', 
    'common.submit'
  ], 'navigation');
  
  // ... остальной код
}
```

### Поиск жестко закодированных строк
```bash
# Запуск скрипта поиска
node scripts/find-hardcoded-strings.js

# Найдет все строки на русском/румынском вне системы переводов
```

## 📋 Конфигурация

### i18n config с жестким контролем
```typescript
// src/i18n/config.ts
i18n.init({
  debug: import.meta.env.DEV,              // Логирование в DEV
  saveMissing: import.meta.env.DEV,        // Сохранение пропущенных ключей
  parseMissingKeyHandler: (key) => {
    console.warn("[i18n] MISSING:", key);
    return `⛔ ${key}`;                     // Видимый индикатор в UI
  },
  returnEmptyString: false,                // Не скрывать пустые переводы
  react: { useSuspense: true }             // Использовать Suspense
});
```

### Suspense обертка
```typescript
// App.tsx обернут в Suspense для ожидания загрузки переводов
<Suspense fallback={<LoadingScreen />}>
  <App />
</Suspense>
```

## 🔍 Как найти проблемы

### 1. Откройте консоль разработчика
Все проблемы логируются с префиксами:
- `🔴 [i18n] MISSING:` - отсутствующие ключи
- `🟡 [i18n] EMPTY:` - пустые переводы  
- `🔵 [i18n] FALLBACK:` - использование fallback

### 2. Проверьте UI на символы ⛔
Все непереведенные ключи отображаются как `⛔ key.name`

### 3. Запустите автоматический отчет
```typescript
import { translationDetector } from '@/i18n/detector';

// В любом месте кода
translationDetector.generateReport();
```

## 🎯 Быстрые исправления

### Добавить недостающий ключ
1. Откройте `src/locales/ru.json` и `src/locales/ro.json`
2. Добавьте ключ в оба файла:
```json
{
  "new.section": {
    "title": "Заголовок"  // ru.json
    "title": "Titlu"      // ro.json  
  }
}
```

### Заменить жестко закодированную строку
```typescript
// ❌ Плохо
<button>Войти</button>

// ✅ Хорошо  
const { t } = useEnhancedI18n();
<button>{t('auth.login')}</button>
```

### Сложные тексты с HTML
```typescript
// ❌ Плохо
<p>Я согласен с <a href="/terms">условиями</a></p>

// ✅ Хорошо
<Trans i18nKey="legal.agree">
  Я согласен с <a href="/terms">условиями</a>
</Trans>

// В JSON:
// "legal": { "agree": "Я согласен с <1>условиями</1>" }
```

## 🚨 Критические проверки

### Перед коммитом
```bash
# 1. Запустите поиск жестко закодированных строк
node scripts/find-hardcoded-strings.js

# 2. Проверьте консоль на ошибки переводов
npm run dev
# Откройте все основные страницы
# Проверьте консоль на 🔴 ошибки

# 3. Переключите язык и повторите
```

### Перед деплоем
1. ✅ Нет ошибок в консоли
2. ✅ Нет символов ⛔ в UI
3. ✅ Оба языка переключаются корректно
4. ✅ Все критические компоненты переведены

## 📚 Дополнительные инструменты

### ESLint правило (планируется)
```json
// .eslintrc.json
{
  "rules": {
    "no-hardcoded-strings": ["error", {
      "allowedStrings": ["ru", "ro", "ServiceHub"],
      "ignoreConsole": true
    }]
  }
}
```

### Автоматическое извлечение ключей (планируется)
```bash
# Извлечение всех t("...") из кода
npm run extract-translations
```

## 🔧 Отладочные команды

```typescript
// Глобальные проверки
import { runGlobalTranslationChecks } from '@/i18n/detector';
runGlobalTranslationChecks();

// Очистка кэша проблем
import { translationDetector } from '@/i18n/detector';
translationDetector.clearIssues();

// Получение всех проблем
const issues = translationDetector.getIssues();
console.log('All issues:', issues);
```

---

## 💡 Лучшие практики

1. **Всегда используйте ключи** вместо прямых строк
2. **Группируйте ключи по контексту**: `auth.login`, `nav.home`
3. **Тестируйте оба языка** при разработке новых компонентов
4. **Проверяйте консоль** регулярно на предупреждения
5. **Используйте строгие хуки** для критических компонентов (платежи, авторизация)

Система поможет вам поддерживать качество переводов на высоком уровне! 🎉