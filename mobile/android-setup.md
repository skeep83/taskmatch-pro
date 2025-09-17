# 🤖 Настройка Android разработки для ServiceHub

## Пошаговая инструкция

### 1️⃣ Требования

**Система:**
- Windows 10/11, macOS, или Linux
- Java 11 или выше
- Node.js 16+ и npm
- Минимум 8GB RAM (рекомендуется 16GB)

**Android Studio:**
- Android Studio Hedgehog (2023.1.1) или новее
- Android SDK Platform 34 (Android 14)
- Android SDK Build-Tools 34.0.0
- Android Emulator

### 2️⃣ Установка Android Studio

1. **Скачайте Android Studio:**
   - Перейдите на [developer.android.com/studio](https://developer.android.com/studio)
   - Скачайте для вашей операционной системы

2. **Установка и настройка:**
   - Запустите установщик
   - Выберите "Standard" установку
   - Дождитесь загрузки всех компонентов

3. **Настройка SDK:**
   ```bash
   # Добавьте в ~/.bashrc или ~/.zshrc (Linux/Mac)
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   
   # Windows (в переменные окружения)
   ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
   PATH=%PATH%;%ANDROID_HOME%\emulator
   PATH=%PATH%;%ANDROID_HOME%\platform-tools
   ```

### 3️⃣ Создание эмулятора

1. **Откройте Android Studio**
2. **Tools → AVD Manager**
3. **Create Virtual Device**
4. **Выберите устройство** (рекомендуется Pixel 7)
5. **Выберите API Level 34** (Android 14)
6. **Настройте эмулятор:**
   - RAM: 4GB или больше
   - Storage: 8GB или больше
   - Graphics: Hardware (если поддерживается)

### 4️⃣ Инициализация проекта

```bash
# Убедитесь что находитесь в корне проекта ServiceHub
cd /path/to/servicehub

# Выполните скрипт настройки
chmod +x scripts/android-dev.sh
./scripts/android-dev.sh
```

### 5️⃣ Первый запуск

**Автоматически (рекомендуется):**
```bash
./scripts/android-dev.sh
# Выберите опцию "1) Полная настройка"
```

**Вручную:**
```bash
# 1. Сборка веб-версии
npm run build

# 2. Синхронизация с Android
npx cap sync android

# 3. Запуск в эмуляторе
npx cap run android
```

### 6️⃣ Режимы разработки

**🔄 Live Reload (рекомендуется для разработки):**
```bash
npx cap run android --livereload --external
```
- Изменения видны моментально
- Не требует пересборки
- Подключается к Lovable sandbox

**🔨 Build + Run (для тестирования):**
```bash
npm run build && npx cap sync android && npx cap run android
```
- Полная сборка приложения
- Тестирование production версии

### 7️⃣ Работа в Android Studio

**Открыть проект:**
```bash
npx cap open android
```

**Настройки в Android Studio:**
1. **Build → Select Build Variant**
   - Debug (для разработки)
   - Release (для продакшна)

2. **Run Configuration:**
   - Target Device: Выберите эмулятор или устройство
   - Deploy: APK from app bundle

3. **Gradle настройки:**
   - compileSdk 34
   - targetSdk 34
   - minSdk 24

### 8️⃣ Тестирование на устройстве

**Подготовка устройства:**
1. **Включите режим разработчика:**
   - Настройки → О телефоне
   - Нажмите 7 раз на "Номер сборки"

2. **Включите USB отладку:**
   - Настройки → Система → Параметры разработчика
   - USB-отладка → Включить

3. **Подключите к компьютеру:**
   ```bash
   # Проверьте подключение
   adb devices
   ```

**Установка на устройство:**
```bash
npx cap run android --target="device"
```

### 9️⃣ Отладка

**Просмотр логов:**
```bash
# Все логи
adb logcat

# Только ошибки
adb logcat *:E

# ServiceHub логи
adb logcat | grep -i servicehub

# Capacitor логи
adb logcat | grep -i capacitor
```

**Chrome DevTools (для веб-части):**
1. Откройте Chrome
2. Перейдите на `chrome://inspect`
3. Найдите ваше устройство
4. Нажмите "Inspect"

**Android Studio Debugger:**
- Breakpoints в Java/Kotlin коде
- Layout Inspector для UI
- Network Inspector

### 🔟 Создание release APK

**1. Создание keystore:**
```bash
keytool -genkey -v -keystore servicehub-release.keystore -alias servicehub -keyalg RSA -keysize 2048 -validity 10000
```

**2. Настройка подписи в `android/app/build.gradle`:**
```gradle
android {
    signingConfigs {
        release {
            keyAlias 'servicehub'
            keyPassword 'your_key_password'
            storeFile file('servicehub-release.keystore')
            storePassword 'your_store_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**3. Сборка release APK:**
```bash
npm run build
npx cap sync android
npx cap open android
# В Android Studio: Build → Generate Signed Bundle/APK
```

### 1️⃣1️⃣ Решение проблем

**Ошибка "ANDROID_HOME not set":**
```bash
# Linux/Mac
export ANDROID_HOME=$HOME/Android/Sdk
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc

# Windows
setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
```

**Ошибка "No connected devices":**
```bash
# Перезапустите adb
adb kill-server
adb start-server
adb devices
```

**Ошибка сборки:**
```bash
# Очистите проект
./scripts/android-dev.sh
# Выберите "7) Очистить проект"
```

**Эмулятор не запускается:**
- Включите Virtualization в BIOS
- Увеличьте RAM эмулятора
- Выберите другой API Level

### 1️⃣2️⃣ Оптимизация производительности

**Настройки эмулятора:**
- Graphics: Hardware - GLES 2.0
- Multi-Core CPU: 4 cores
- RAM: 4096 MB
- VM Heap: 512 MB

**Gradle настройки в `gradle.properties`:**
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.daemon=true
android.enableJetifier=true
android.useAndroidX=true
```

### 1️⃣3️⃣ Подготовка к Google Play

**Требования:**
- Target API Level 34 (Android 14)
- 64-bit архитектура
- Подписанный AAB (Android App Bundle)

**Метаданные:**
- Название: ServiceHub
- Описание на русском и румынском
- Категория: Business
- Content Rating: Everyone

**Ресурсы:**
- Иконка: 512x512 PNG
- Feature Graphic: 1024x500 JPG/PNG
- Скриншоты: телефоны и планшеты
- Privacy Policy URL

## 🎯 Быстрый старт

Если хотите сразу увидеть приложение в действии:

```bash
# 1. Убедитесь что Android Studio установлен
# 2. Создайте эмулятор (см. раздел 3)

# 3. Клонируйте проект
git clone [your-repo]
cd servicehub

# 4. Установите зависимости
npm install

# 5. Запустите Android скрипт
chmod +x scripts/android-dev.sh
./scripts/android-dev.sh

# 6. Выберите "1) Полная настройка"
# 7. Затем "3) Запуск приложения" → "1) Эмулятор"
```

Готово! Приложение ServiceHub запустится в Android эмуляторе! 🤖