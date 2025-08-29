# Анимации 3D Карусели

## Framer Motion Конфигурация

### Основные Принципы
- **Плавность**: Все анимации имеют естественные кривые замедления
- **Производительность**: Использование GPU-ускоренных трансформаций
- **Доступность**: Уважение к `prefers-reduced-motion`
- **Последовательность**: Единообразие временных характеристик

## Анимации Карточек

### 1. Анимация Входа
```typescript
const cardVariants = {
  initial: { 
    opacity: 0, 
    x: 100, 
    rotateY: 15,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    x: 0, 
    rotateY: 0,
    scale: 1
  },
  exit: { 
    opacity: 0, 
    x: -100, 
    rotateY: -15,
    scale: 0.95
  }
};

const transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1], // custom cubic-bezier
  type: "tween"
};
```

### 2. 3D Трансформации
```css
/* CSS для поддержки 3D */
.perspective-1000 {
  perspective: 1000px;
}

.card-3d {
  transform-style: preserve-3d;
  backface-visibility: hidden;
}
```

### 3. Анимация Стекирования
```typescript
const stackAnimation = {
  initial: { 
    z: -index * 10,
    scale: 1 - (index * 0.05),
    opacity: 1 - (index * 0.2)
  },
  animate: {
    z: 0,
    scale: 1,
    opacity: 1,
    transition: {
      delay: index * 0.1
    }
  }
};
```

## Анимации Интерактивных Элементов

### 1. Аватар Специалиста
```typescript
const avatarAnimation = {
  whileHover: { 
    scale: 1.1, 
    rotate: 5,
    transition: { duration: 0.2 }
  },
  whileTap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

// Анимация статуса
const statusIndicator = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};
```

### 2. Кнопки Действий
```typescript
const buttonHover = {
  whileHover: { 
    scale: 1.05,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    transition: { duration: 0.2 }
  },
  whileTap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// Градиентная анимация
const gradientShift = {
  background: [
    "linear-gradient(45deg, #ec4899, #9333ea)",
    "linear-gradient(45deg, #9333ea, #ec4899)",
    "linear-gradient(45deg, #ec4899, #9333ea)"
  ],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "linear"
  }
};
```

## Анимации Портфолио

### 1. Модальное Окно
```typescript
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.2
    }
  }
};
```

### 2. Смена Изображений
```typescript
const imageTransition = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
    filter: "blur(4px)"
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    scale: 1.05,
    filter: "blur(4px)",
    transition: {
      duration: 0.2
    }
  }
};
```

### 3. Миниатюры
```typescript
const thumbnailHover = {
  whileHover: { 
    scale: 1.02,
    y: -2,
    transition: { duration: 0.2 }
  },
  whileTap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// Индикатор активной миниатюры
const activeIndicator = {
  initial: { scale: 0 },
  animate: { 
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};
```

## Анимации Навигации

### 1. Индикаторы Прогресса
```typescript
const dotAnimation = {
  inactive: {
    scale: 1,
    backgroundColor: "hsl(var(--muted))",
    transition: { duration: 0.2 }
  },
  active: {
    scale: 1.25,
    backgroundColor: "hsl(var(--primary))",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};
```

### 2. Кнопки Навигации
```typescript
const navButtonAnimation = {
  whileHover: {
    backgroundColor: "hsl(var(--muted))",
    scale: 1.1,
    transition: { duration: 0.2 }
  },
  whileTap: {
    scale: 0.9,
    transition: { duration: 0.1 }
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
    transition: { duration: 0.2 }
  }
};
```

## Анимации Загрузки

### 1. Скелетон Загрузки
```typescript
const skeletonPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};
```

### 2. Спиннер
```typescript
const spinnerAnimation = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};
```

## Анимации Обратной Связи

### 1. Уведомления
```typescript
const toastAnimation = {
  initial: { 
    opacity: 0, 
    y: -50,
    scale: 0.9 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    y: -50,
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};
```

### 2. Состояния Успеха/Ошибки
```typescript
const successAnimation = {
  initial: { scale: 0, rotate: -180 },
  animate: { 
    scale: 1, 
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
      delay: 0.1
    }
  }
};

const errorShake = {
  animate: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  }
};
```

## Настройки Производительности

### 1. Layout Animations
```typescript
const layoutConfig = {
  layout: true,
  layoutId: "unique-id",
  transition: {
    layout: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};
```

### 2. Оптимизация GPU
```css
/* CSS для GPU-ускорения */
.gpu-optimized {
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

### 3. Reduced Motion
```typescript
const respectsMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const animation = respectsMotion ? {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
} : {
  // Полные анимации
};
```

## Временные Характеристики

### Стандартные Длительности
- **Микро-взаимодействия**: 0.1-0.2s
- **Переходы**: 0.3-0.4s  
- **Модальные окна**: 0.4-0.6s
- **Загрузка**: 1.0-1.5s

### Кривые Замедления
```typescript
const easings = {
  sharp: [0.4, 0.0, 0.6, 1],      // Быстрый вход
  standard: [0.4, 0.0, 0.2, 1],   // Стандартный
  decelerated: [0.0, 0.0, 0.2, 1], // Плавное замедление
  accelerated: [0.4, 0.0, 1, 1]    // Ускорение
};
```