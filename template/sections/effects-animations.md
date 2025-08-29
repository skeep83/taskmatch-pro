# Эффекты и Анимации

## Система анимаций

### Базовые анимации Tailwind
Кастомные анимации определены в `tailwind.config.ts`:

```typescript
keyframes: {
  'fade-in': { 
    '0%': { opacity: '0', transform: 'translateY(6px)' }, 
    '100%': { opacity: '1', transform: 'translateY(0)' } 
  },
  'scale-in': { 
    '0%': { transform: 'scale(0.98)', opacity: '0' }, 
    '100%': { transform: 'scale(1)', opacity: '1' } 
  },
  'float': { 
    '0%': { transform: 'translateY(0) scale(1)' }, 
    '50%': { transform: 'translateY(-3px) scale(1)' }, 
    '100%': { transform: 'translateY(0) scale(1)' } 
  },
  'glow': { 
    '0%': { filter: 'drop-shadow(0 0 0 hsl(var(--primary)/0))' }, 
    '50%': { filter: 'drop-shadow(0 0 8px hsl(var(--primary)/0.25))' }, 
    '100%': { filter: 'drop-shadow(0 0 0 hsl(var(--primary)/0))' } 
  },
  'gradient-shift': { 
    '0%, 100%': { backgroundPosition: '0% 50%' }, 
    '50%': { backgroundPosition: '100% 50%' } 
  }
}
```

### Анимации в CSS
```css
animation: {
  'fade-in': 'fade-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'scale-in': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  'float-slow': 'float 4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'glow-soft': 'glow 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'gradient-shift': 'gradient-shift 8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'float-infinite': 'float 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
  'pulse-infinite': 'pulse-glow 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
}
```

## Анимации появления

### 1. Fade In - базовое появление
```jsx
<div className="animate-fade-in">
  Элемент плавно появляется снизу
</div>

// С задержкой
<div 
  className="animate-fade-in"
  style={{ animationDelay: '200ms' }}
>
  Появляется с задержкой
</div>
```

### 2. Scale In - появление с увеличением
```jsx
<div className="animate-scale-in">
  Элемент увеличивается при появлении
</div>
```

### 3. Последовательная анимация
```jsx
{items.map((item, index) => (
  <div 
    key={item.id}
    className="animate-fade-in"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    {item.content}
  </div>
))}
```

## Hover эффекты

### 1. Scale - увеличение при наведении
```jsx
<div className="hover:scale-105 transition-transform duration-300">
  Увеличивается при hover
</div>

// Утилитный класс
<div className="hover-scale">
  Увеличение с готовым классом
</div>
```

### 2. Float - парение
```jsx
<div className="hover:animate-float-slow">
  Парит при наведении
</div>

// Утилитный класс
<div className="hover-float">
  Парение с готовым классом
</div>
```

### 3. Glow - свечение
```jsx
<div className="hover:animate-glow-soft">
  Светится при наведении
</div>

// Утилитный класс
<div className="hover-glow">
  Свечение с готовым классом
</div>
```

### 4. Комбинированные эффекты
```jsx
<div className="card-surface group">
  <div className="group-hover:scale-110 group-hover:animate-float-slow transition-all duration-300">
    Комбинация увеличения и парения
  </div>
</div>
```

## Фоновые эффекты

### 1. SignatureGradient - интерактивный градиент
```jsx
import { SignatureGradient } from "@/components/SignatureGradient";

// Использование
<div className="relative">
  <SignatureGradient />
  <div className="relative z-10">
    Контент поверх интерактивного градиента
  </div>
</div>
```

### 2. Анимированный градиентный текст
```jsx
<h1 className="text-gradient animate-gradient-shift">
  Заголовок с движущимся градиентом
</h1>
```

#### CSS для градиентного текста
```css
.text-gradient {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.animate-gradient-shift {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}
```

## Neumorphic эффекты

### 1. Card Surface - выпуклые тени
```css
.card-surface {
  background: var(--surface-raised);
  box-shadow: var(--shadow-raised);
}

.card-surface:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-raised-hover);
}
```

### 2. CSS переменные для теней
```css
:root {
  --shadow-raised: 
    9px 9px 18px rgba(174, 187, 204, 0.5),
    -9px -9px 18px rgba(255, 255, 255, 0.5);
  
  --shadow-raised-hover: 
    14px 14px 28px rgba(174, 187, 204, 0.6),
    -14px -14px 28px rgba(255, 255, 255, 0.6);
  
  --shadow-raised-strong: 
    18px 18px 36px rgba(174, 187, 204, 0.7),
    -18px -18px 36px rgba(255, 255, 255, 0.7);
}
```

### 3. Neumorphic кнопки
```css
.btn-hero {
  background: var(--surface-raised);
  color: hsl(var(--primary));
  box-shadow: var(--shadow-raised);
}

.btn-hero:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-raised-hover);
}

.btn-hero:active {
  transform: translateY(1px);
  box-shadow: 
    4px 4px 8px rgba(174, 187, 204, 0.4),
    -4px -4px 8px rgba(255, 255, 255, 0.3);
}
```

## 3D трансформации

### 1. Базовая настройка 3D
```css
.perspective-1000 {
  perspective: 1000px;
}

.card-3d {
  transform-style: preserve-3d;
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### 2. 3D hover эффекты
```css
.card-3d:hover {
  transform: translateY(-12px) rotateX(8deg) rotateY(3deg) scale(1.03);
}
```

### 3. Использование в React
```jsx
<div className="perspective-1000">
  <div className="card-3d card-surface">
    <div className="transform-gpu">
      Контент с 3D эффектами
    </div>
  </div>
</div>
```

## Анимированные ссылки

### 1. Story Link - подчеркивание
```css
.story-link {
  position: relative;
  display: inline-block;
}

.story-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: hsl(var(--primary));
  transform: scaleX(0);
  transform-origin: bottom right;
  transition: transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.story-link:hover::after {
  transform: scaleX(1);
  transform-origin: bottom left;
}
```

### 2. Использование
```jsx
<a href="/catalog" className="story-link">
  Анимированная ссылка
</a>
```

## Загрузочные анимации

### 1. Скелетон
```jsx
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
);

// Использование
<div className="card-surface p-6">
  <Skeleton className="h-4 w-3/4 mb-4" />
  <Skeleton className="h-3 w-1/2 mb-2" />
  <Skeleton className="h-3 w-2/3" />
</div>
```

### 2. Спиннер
```jsx
const Spinner = ({ size = 24 }) => (
  <div 
    className="animate-spin border-2 border-muted border-t-primary rounded-full"
    style={{ width: size, height: size }}
  />
);
```

### 3. Пульсирующий элемент
```jsx
<div className="animate-pulse-infinite bg-primary/20 rounded-full w-4 h-4" />
```

## Переходные анимации

### 1. Slide анимации
```jsx
// Появление справа
<div className="animate-slide-in-right">
  Контент появляется справа
</div>

// Исчезновение вправо
<div className="animate-slide-out-right">
  Контент исчезает вправо
</div>
```

### 2. Составные анимации
```jsx
// Комбинация fade и scale
<div className="animate-enter">
  Появление с fade + scale
</div>

<div className="animate-exit">
  Исчезновение с fade + scale
</div>
```

## Framer Motion анимации

### 1. Базовая настройка
```jsx
import { motion, AnimatePresence } from 'framer-motion';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

<motion.div
  variants={fadeInUp}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={{ duration: 0.5 }}
>
  Контент с Framer Motion
</motion.div>
```

### 2. Последовательная анимация
```jsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div
  variants={container}
  initial="hidden"
  animate="show"
>
  {items.map(item => (
    <motion.div key={item.id} variants={item}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### 3. Hover анимации
```jsx
<motion.div
  whileHover={{ 
    scale: 1.05,
    transition: { duration: 0.2 }
  }}
  whileTap={{ scale: 0.95 }}
>
  Интерактивный элемент
</motion.div>
```

## Кастомные хуки для анимаций

### 1. useIntersectionObserver
```jsx
const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
};

// Использование
const AnimatedSection = ({ children }) => {
  const ref = useRef();
  const isVisible = useIntersectionObserver(ref, { threshold: 0.1 });

  return (
    <div 
      ref={ref}
      className={`transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {children}
    </div>
  );
};
```

### 2. useStaggerAnimation
```jsx
const useStaggerAnimation = (items, delay = 100) => {
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleItems(prev => {
        if (prev < items.length) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, delay);

    return () => clearInterval(timer);
  }, [items.length, delay]);

  return visibleItems;
};
```

## Принципы анимаций

### 1. Easing кривые
```typescript
const easings = {
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeIn: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
};
```

### 2. Длительности
```typescript
const durations = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms'
};
```

### 3. Prefers-reduced-motion
```jsx
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

// Использование
const AnimatedComponent = () => {
  const reducedMotion = useReducedMotion();
  
  return (
    <div className={reducedMotion ? '' : 'animate-fade-in'}>
      Уважение к настройкам пользователя
    </div>
  );
};
```