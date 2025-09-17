#!/bin/bash

# ServiceHub iOS Development Script
# Автоматизация разработки под iOS

echo "🍎 ServiceHub iOS Development Workflow"
echo "======================================="

# Проверяем зависимости
check_dependencies() {
    echo "📋 Проверяем зависимости..."
    
    if ! command -v npx &> /dev/null; then
        echo "❌ Node.js/npm не установлен"
        exit 1
    fi
    
    if ! command -v xcodebuild &> /dev/null; then
        echo "❌ Xcode не установлен"
        echo "💡 Установите Xcode из App Store"
        exit 1
    fi
    
    echo "✅ Все зависимости установлены"
}

# Инициализация Capacitor (выполняется один раз)
init_capacitor() {
    echo "🚀 Инициализация Capacitor..."
    
    if [ ! -f "capacitor.config.ts" ]; then
        npx cap init
    else
        echo "✅ Capacitor уже инициализирован"
    fi
    
    # Добавляем iOS платформу
    if [ ! -d "ios" ]; then
        echo "📱 Добавляем iOS платформу..."
        npx cap add ios
    else
        echo "✅ iOS платформа уже добавлена"
    fi
}

# Сборка и синхронизация
build_and_sync() {
    echo "🔨 Сборка веб-версии..."
    npm run build
    
    echo "🔄 Синхронизация с iOS..."
    npx cap sync ios
    
    echo "✅ Сборка завершена"
}

# Запуск на устройстве/симуляторе
run_ios() {
    echo "📱 Запуск на iOS..."
    echo "Выберите опцию:"
    echo "1) Симулятор (по умолчанию)"
    echo "2) Физическое устройство"
    echo "3) Открыть в Xcode"
    
    read -p "Введите номер опции (1-3): " choice
    
    case $choice in
        1|"")
            echo "🔄 Запуск в симуляторе..."
            npx cap run ios
            ;;
        2)
            echo "📲 Запуск на устройстве..."
            npx cap run ios --target="device"
            ;;
        3)
            echo "🔧 Открываем в Xcode..."
            npx cap open ios
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
    
    npx cap run ios --livereload --external
}

# Меню выбора действий
main_menu() {
    echo ""
    echo "Выберите действие:"
    echo "1) Полная настройка (первый запуск)"
    echo "2) Сборка и синхронизация"
    echo "3) Запуск приложения"
    echo "4) Live Reload (для разработки)"
    echo "5) Проверить зависимости"
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
            run_ios
            ;;
        4)
            live_reload
            ;;
        5)
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