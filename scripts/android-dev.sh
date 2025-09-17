#!/bin/bash

# ServiceHub Android Development Script
# Автоматизация разработки под Android

echo "🤖 ServiceHub Android Development Workflow"
echo "=========================================="

# Проверяем зависимости
check_dependencies() {
    echo "📋 Проверяем зависимости..."
    
    if ! command -v npx &> /dev/null; then
        echo "❌ Node.js/npm не установлен"
        exit 1
    fi
    
    if ! command -v java &> /dev/null; then
        echo "❌ Java не установлен"
        echo "💡 Установите Java 11 или выше"
        exit 1
    fi
    
    # Проверяем Android SDK (опционально, если установлен через Android Studio)
    if [ -n "$ANDROID_HOME" ]; then
        echo "✅ Android SDK найден в $ANDROID_HOME"
    else
        echo "⚠️  Android SDK не найден в переменных окружения"
        echo "💡 Установите Android Studio и настройте ANDROID_HOME"
    fi
    
    echo "✅ Основные зависимости проверены"
}

# Инициализация Capacitor (выполняется один раз)
init_capacitor() {
    echo "🚀 Инициализация Capacitor..."
    
    if [ ! -f "capacitor.config.ts" ]; then
        npx cap init
    else
        echo "✅ Capacitor уже инициализирован"
    fi
    
    # Добавляем Android платформу
    if [ ! -d "android" ]; then
        echo "📱 Добавляем Android платформу..."
        npx cap add android
    else
        echo "✅ Android платформа уже добавлена"
    fi
}

# Сборка и синхронизация
build_and_sync() {
    echo "🔨 Сборка веб-версии..."
    npm run build
    
    echo "🔄 Синхронизация с Android..."
    npx cap sync android
    
    echo "✅ Сборка завершена"
}

# Запуск на устройстве/эмуляторе
run_android() {
    echo "📱 Запуск на Android..."
    echo "Выберите опцию:"
    echo "1) Эмулятор (по умолчанию)"
    echo "2) Физическое устройство"
    echo "3) Открыть в Android Studio"
    echo "4) Список доступных устройств"
    
    read -p "Введите номер опции (1-4): " choice
    
    case $choice in
        1|"")
            echo "🔄 Запуск в эмуляторе..."
            npx cap run android
            ;;
        2)
            echo "📲 Запуск на физическом устройстве..."
            echo "Убедитесь что:"
            echo "- USB отладка включена"
            echo "- Устройство подключено"
            echo "- Драйверы установлены"
            npx cap run android --target="device"
            ;;
        3)
            echo "🔧 Открываем в Android Studio..."
            npx cap open android
            ;;
        4)
            echo "📱 Доступные устройства:"
            if command -v adb &> /dev/null; then
                adb devices
            else
                echo "ADB не найден. Установите Android SDK."
            fi
            run_android
            ;;
        *)
            echo "❌ Неверный выбор"
            exit 1
            ;;
    esac
}

# Live Reload режим для разработки
live_reload() {
    echo "🔄 Запуск Live Reload режима..."
    echo "Изменения будут видны моментально!"
    echo "Выберите устройство:"
    echo "1) Эмулятор"
    echo "2) Физическое устройство"
    
    read -p "Введите номер: " device_choice
    
    case $device_choice in
        1)
            npx cap run android --livereload --external
            ;;
        2)
            npx cap run android --livereload --external --target="device"
            ;;
        *)
            echo "❌ Неверный выбор"
            ;;
    esac
}

# Создание подписанного APK
build_release() {
    echo "📦 Создание release APK..."
    echo "⚠️  Убедитесь что настроен keystore в android/app/build.gradle"
    
    npm run build
    npx cap sync android
    npx cap open android
    
    echo "📱 В Android Studio:"
    echo "1. Build → Generate Signed Bundle/APK"
    echo "2. Выберите APK"
    echo "3. Выберите ваш keystore"
    echo "4. Выберите 'release' build variant"
}

# Настройка keystore
setup_keystore() {
    echo "🔐 Настройка keystore для подписи APK..."
    
    read -p "Введите имя keystore файла (например: servicehub-release.keystore): " keystore_name
    read -p "Введите alias (например: servicehub): " alias_name
    
    echo "🔑 Создание keystore..."
    keytool -genkey -v -keystore "$keystore_name" -alias "$alias_name" -keyalg RSA -keysize 2048 -validity 10000
    
    echo "✅ Keystore создан: $keystore_name"
    echo "💡 Скопируйте файл в android/app/ и настройте build.gradle"
    echo ""
    echo "Добавьте в android/app/build.gradle:"
    echo "android {"
    echo "    signingConfigs {"
    echo "        release {"
    echo "            keyAlias '$alias_name'"
    echo "            keyPassword 'your_key_password'"
    echo "            storeFile file('$keystore_name')"
    echo "            storePassword 'your_store_password'"
    echo "        }"
    echo "    }"
    echo "    buildTypes {"
    echo "        release {"
    echo "            signingConfig signingConfigs.release"
    echo "        }"
    echo "    }"
    echo "}"
}

# Очистка проекта
clean_project() {
    echo "🧹 Очистка проекта..."
    
    npx cap clean android
    rm -rf android/app/build
    rm -rf android/.gradle
    rm -rf node_modules/.cache
    
    echo "🔄 Переустановка зависимостей..."
    npm install
    npm run build
    npx cap sync android
    
    echo "✅ Проект очищен"
}

# Проверка устройств
check_devices() {
    echo "📱 Проверка подключенных устройств..."
    
    if command -v adb &> /dev/null; then
        echo "🔌 USB устройства:"
        adb devices
        echo ""
        
        echo "🚀 Эмуляторы:"
        if command -v emulator &> /dev/null; then
            emulator -list-avds
        else
            echo "Emulator не найден. Установите Android SDK."
        fi
    else
        echo "❌ ADB не найден"
        echo "💡 Установите Android SDK и добавьте в PATH"
    fi
}

# Логи и отладка
view_logs() {
    echo "📄 Просмотр логов Android..."
    echo "Выберите тип логов:"
    echo "1) Все логи"
    echo "2) Только ошибки"
    echo "3) ServiceHub логи"
    echo "4) Capacitor логи"
    
    read -p "Введите номер: " log_choice
    
    case $log_choice in
        1)
            adb logcat
            ;;
        2)
            adb logcat *:E
            ;;
        3)
            adb logcat | grep -i servicehub
            ;;
        4)
            adb logcat | grep -i capacitor
            ;;
        *)
            echo "❌ Неверный выбор"
            ;;
    esac
}

# Меню выбора действий
main_menu() {
    echo ""
    echo "Выберите действие:"
    echo "1) Полная настройка (первый запуск)"
    echo "2) Сборка и синхронизация"
    echo "3) Запуск приложения"
    echo "4) Live Reload (для разработки)"
    echo "5) Создать release APK"
    echo "6) Настроить keystore"
    echo "7) Очистить проект"
    echo "8) Проверить устройства"
    echo "9) Просмотр логов"
    echo "10) Проверить зависимости"
    echo "0) Выход"
    
    read -p "Введите номер действия: " action
    
    case $action in
        1)
            check_dependencies
            init_capacitor
            build_and_sync
            echo "🎉 Настройка завершена! Теперь можно запускать приложение."
            ;;
        2)
            build_and_sync
            ;;
        3)
            run_android
            ;;
        4)
            live_reload
            ;;
        5)
            build_release
            ;;
        6)
            setup_keystore
            ;;
        7)
            clean_project
            ;;
        8)
            check_devices
            ;;
        9)
            view_logs
            ;;
        10)
            check_dependencies
            ;;
        0)
            echo "👋 До свидания!"
            exit 0
            ;;
        *)
            echo "❌ Неверный выбор"
            main_menu
            ;;
    esac
}

# Запуск основного меню
main_menu