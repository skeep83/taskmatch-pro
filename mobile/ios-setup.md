# 🍎 Настройка iOS разработки для ServiceHub

## Пошаговая инструкция

### 1️⃣ Требования

**macOS система:**
- macOS Big Sur (11.0) или новее
- Xcode 14.0 или новее
- Node.js 16+ и npm

**Apple Developer Account:**
- Бесплатный аккаунт (для симулятора и тестирования на своем устройстве)
- Платный аккаунт $99/год (для App Store)

### 2️⃣ Установка Xcode

1. Откройте App Store
2. Найдите и установите Xcode
3. Запустите Xcode и согласитесь с лицензией
4. Установите дополнительные компоненты

```bash
# Установка Command Line Tools
sudo xcode-select --install
```

### 3️⃣ Инициализация проекта

```bash
# Убедитесь что находитесь в корне проекта ServiceHub
cd /path/to/servicehub

# Выполните скрипт настройки
chmod +x scripts/ios-dev.sh
./scripts/ios-dev.sh
```

### 4️⃣ Первый запуск

**Автоматически (рекомендуется):**
```bash
./scripts/ios-dev.sh
# Выберите опцию "1) Полная настройка"
```

**Вручную:**
```bash
# 1. Сборка веб-версии
npm run build

# 2. Синхронизация с iOS
npx cap sync ios

# 3. Запуск в симуляторе
npx cap run ios
```

### 5️⃣ Режимы разработки

**🔄 Live Reload (рекомендуется для разработки):**
```bash
npx cap run ios --livereload --external
```
- Изменения видны моментально
- Не требует пересборки
- Подключается к Lovable sandbox

**🔨 Build + Run (для тестирования):**
```bash
npm run build && npx cap sync ios && npx cap run ios
```
- Полная сборка приложения
- Тестирование production версии

### 6️⃣ Работа в Xcode

**Открыть проект:**
```bash
npx cap open ios
```

**Настройки в Xcode:**
1. **Signing & Capabilities**
   - Team: выберите ваш Apple ID
   - Bundle Identifier: `app.lovable.6e55eb01313b440fa7fe90daae1051fc`
   
2. **General**
   - Display Name: ServiceHub
   - Version: 1.0.0
   - Minimum Deployments: iOS 14.0

3. **Info.plist настройки:**
   - Camera usage: "Для загрузки фото работ"
   - Location usage: "Для поиска специалистов рядом"

### 7️⃣ Тестирование на устройстве

**Подключение iPhone/iPad:**
1. Подключите устройство к Mac
2. Доверьтесь компьютеру на устройстве
3. В Xcode выберите ваше устройство
4. Нажмите ▶️ Run

**Первый запуск на устройстве:**
1. Приложение установится, но не запустится
2. Перейдите: Настройки → Основные → VPN и управление устройством
3. Найдите ваш профиль разработчика → Доверять

### 8️⃣ Отладка

**Просмотр логов в Xcode:**
- Console → All Messages
- Фильтр по "ServiceHub" или "Capacitor"

**Web Inspector (для веб-части):**
1. Safari → Разработка → [Ваше устройство] → [ServiceHub]
2. Используйте обычные DevTools

**Capacitor Live Reload:**
```bash
# Показывает IP адрес для подключения
npx cap run ios --livereload --external
```

### 9️⃣ Решение проблем

**Ошибка "No provisioning profile":**
- Убедитесь что выбрали Team в Xcode
- Попробуйте изменить Bundle ID на уникальный

**Ошибка сборки:**
```bash
# Очистите кэш
npx cap clean ios
npm run build
npx cap sync ios
```

**Приложение не обновляется:**
```bash
# Принудительная синхронизация
npx cap copy ios
npx cap update ios
```

### 🔟 Следующие шаги

1. **Тестирование функций:**
   - Регистрация/вход
   - Создание заказов
   - Чаты и уведомления

2. **Подготовка к релизу:**
   - Настройка иконок
   - Создание скриншотов
   - Настройка метаданных

3. **App Store Connect:**
   - Создание записи приложения
   - Загрузка через Xcode Organizer

## 🎯 Быстрый старт

Если хотите сразу увидеть приложение в действии:

```bash
# 1. Клонируйте проект
git clone [your-repo]
cd servicehub

# 2. Установите зависимости
npm install

# 3. Запустите iOS скрипт
chmod +x scripts/ios-dev.sh
./scripts/ios-dev.sh

# 4. Выберите "1) Полная настройка"
# 5. Дождитесь запуска приложения в симуляторе
```

Готово! Приложение ServiceHub должно запуститься в симуляторе iOS! 🎉