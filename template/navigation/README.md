# Navigation Components

Эта папка содержит шаблоны компонентов навигации в neumorphic стиле.

## NeumorphicSidebar.tsx

Боковая навигация админ панели с neumorphic дизайном:

### Особенности:
- Neumorphic стиль с тенями и эффектами нажатия
- Анимированные иконки с индикаторами активности
- Плавные переходы между состояниями
- Цветовая кодировка для разных разделов
- Адаптивный дизайн

### Использование:
```tsx
import { NeumorphicSidebar } from './NeumorphicSidebar';

// В layout компоненте
<NeumorphicSidebar />
```

### Стили:
- Фон: `#E5E7EB`
- Тени: `8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB`
- Активное состояние: `inset` тени
- Анимации: `framer-motion` с задержками

### Кастомизация:
Для изменения навигационных элементов редактируйте массив `navigationItems`:
```tsx
const navigationItems = [
  { 
    name: "Название", 
    path: "/путь", 
    icon: IconComponent, 
    color: "#цвет"
  }
];
```