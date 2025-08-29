# Neumorphism Дизайн Система

## Философия Neumorphism

Neumorphism (от "New Skeuomorphism") - это дизайн-система, которая создает эффект мягких, выпуклых элементов, как будто они "выдавлены" из поверхности. Основные принципы:

- **Монохроматичность**: Один базовый цвет с вариациями
- **Мягкие тени**: Двойные тени (светлая и темная)
- **Скругленные углы**: Большие радиусы border-radius
- **Минимализм**: Чистые формы без лишних деталей

## Цветовая палитра

### Основные цвета
```css
:root {
  /* Фирменные цвета */
  --brand-1: 258 80% 50%;     /* Индиго-фиолетовый */
  --brand-2: 199 89% 48%;     /* Циан */
  --brand-3: 280 72% 60%;     /* Пурпурный */
  --brand-glow: 258 80% 65%;  /* Светящийся акцент */
  
  /* Neumorphic поверхность */
  --background-neomorphic: hsl(220, 16%, 93%); /* Серо-голубой */
}
```

### Градиенты поверхностей
```css
:root {
  /* Neumorphic поверхности */
  --surface-raised: linear-gradient(145deg, hsl(220, 16%, 95%), hsl(220, 16%, 92%));
  --surface-elevated: linear-gradient(145deg, hsl(220, 16%, 94%), hsl(220, 16%, 91%));
}
```

## Система теней

### Базовые тени
```css
:root {
  /* Основные neumorphic тени */
  --shadow-raised: 
    9px 9px 18px rgba(174, 187, 204, 0.5),    /* Темная тень */
    -9px -9px 18px rgba(255, 255, 255, 0.5);  /* Светлая тень */
  
  --shadow-raised-hover: 
    14px 14px 28px rgba(174, 187, 204, 0.6),
    -14px -14px 28px rgba(255, 255, 255, 0.6);
  
  --shadow-raised-strong: 
    18px 18px 36px rgba(174, 187, 204, 0.7),
    -18px -18px 36px rgba(255, 255, 255, 0.7);
}
```

### Темная тема
```css
.dark {
  --shadow-raised: 
    9px 9px 18px rgba(0, 0, 0, 0.4),
    -9px -9px 18px rgba(255, 255, 255, 0.08);
  
  --shadow-raised-hover: 
    14px 14px 28px rgba(0, 0, 0, 0.5),
    -14px -14px 28px rgba(255, 255, 255, 0.1);
    
  --background-neomorphic: hsl(220, 16%, 18%);
}
```

## Компоненты Neumorphism

### 1. Card Surface - основная поверхность
```css
.card-surface {
  @apply rounded-3xl border-0 p-8 relative transition-all duration-300 ease-out;
  background: var(--surface-raised);
  box-shadow: var(--shadow-raised);
}

.card-surface:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-raised-hover);
}
```

### 2. Glass Surface - стеклянная поверхность
```css
.glass-surface {
  @apply rounded-3xl border-0 p-8 relative transition-all duration-300 ease-out;
  background: var(--surface-elevated);
  box-shadow: var(--shadow-raised);
  backdrop-filter: blur(12px);
}

.glass-surface:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-raised-hover);
}
```

### 3. Acrylic Surface - матовая поверхность
```css
.acrylic-surface {
  @apply rounded-3xl border-0 p-8 relative transition-all duration-300 ease-out;
  background: var(--surface-elevated);
  box-shadow: var(--shadow-raised-strong);
}

.acrylic-surface:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-raised-hover);
}
```

## Кнопки Neumorphism

### 1. Hero Button - основная кнопка
```css
.btn-hero {
  @apply inline-flex items-center justify-center rounded-2xl px-8 py-4 font-semibold transition-all duration-300 ease-out border-0;
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

### 2. Ghost Button - вторичная кнопка
```css
.btn-ghost {
  @apply inline-flex items-center justify-center rounded-2xl px-8 py-4 font-semibold border-0 transition-all duration-300 ease-out;
  background: var(--surface-raised);
  color: hsl(var(--foreground));
  box-shadow: var(--shadow-raised);
}

.btn-ghost:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-raised-hover);
}
```

## Иконки Neumorphism

### NeumorphicIcon компонент
```tsx
interface NeumorphicIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  iconSize?: number;
  delayMs?: number;
  variant?: 'circle' | 'rounded' | 'square';
}

export const NeumorphicIcon = ({ 
  icon: Icon, 
  size = 48, 
  iconSize, 
  className,
  delayMs = 0,
  variant = 'circle',
  ...props 
}: NeumorphicIconProps) => {
  const actualIconSize = iconSize || size * 0.4;
  
  const variantStyles = {
    circle: 'rounded-full',
    rounded: 'rounded-2xl', 
    square: 'rounded-2xl'
  };

  return (
    <div
      className={cn(
        'card-surface flex items-center justify-center transition-all duration-300 ease-out border-0',
        variantStyles[variant],
        className
      )}
      style={{
        width: size,
        height: size,
        animationDelay: `${delayMs}ms`,
      }}
      {...props}
    >
      <Icon 
        size={actualIconSize} 
        className="text-slate-500 dark:text-slate-400"
        strokeWidth={2}
      />
    </div>
  );
};
```

### Использование
```jsx
<NeumorphicIcon 
  icon={Wrench}
  size={112}
  variant="square"
  className="group-hover:scale-110 transition-transform mx-auto"
  delayMs={100}
/>
```

## Навигация Neumorphism

### Glass Navigation
```css
.glass-nav {
  @apply border-0 sticky top-0 z-50;
  background: var(--surface-raised);
  box-shadow: var(--shadow-raised);
  backdrop-filter: blur(12px);
}
```

### Sidebar Neumorphism
```jsx
<div className="card-surface h-screen w-64 p-6">
  <nav className="space-y-2">
    {navItems.map(item => (
      <a 
        key={item.id}
        href={item.href}
        className="block p-3 rounded-xl hover:bg-white/50 transition-colors"
      >
        {item.label}
      </a>
    ))}
  </nav>
</div>
```

## Формы Neumorphism

### Input поля
```css
.neumorphic-input {
  @apply w-full px-4 py-3 rounded-xl border-0 transition-all duration-300;
  background: var(--surface-raised);
  box-shadow: 
    inset 4px 4px 8px rgba(174, 187, 204, 0.4),
    inset -4px -4px 8px rgba(255, 255, 255, 0.3);
}

.neumorphic-input:focus {
  outline: none;
  box-shadow: 
    inset 6px 6px 12px rgba(174, 187, 204, 0.5),
    inset -6px -6px 12px rgba(255, 255, 255, 0.4),
    0 0 0 2px hsl(var(--primary) / 0.3);
}
```

### Форма с neumorphic стилем
```jsx
<div className="card-surface p-8 max-w-md mx-auto">
  <form className="space-y-6">
    <div>
      <label className="block text-sm font-medium mb-2">
        Email
      </label>
      <input 
        type="email"
        className="neumorphic-input"
        placeholder="your@email.com"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium mb-2">
        Пароль
      </label>
      <input 
        type="password"
        className="neumorphic-input"
        placeholder="••••••••"
      />
    </div>
    
    <button type="submit" className="btn-hero w-full">
      Войти
    </button>
  </form>
</div>
```

## Floating Card

### FloatingCard компонент
```tsx
export interface FloatingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  hover?: boolean;
  glow?: boolean;
}

export const FloatingCard = React.forwardRef<HTMLDivElement, FloatingCardProps>(
  ({ className, children, delay = 0, hover = true, glow = false, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    }, [delay]);

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-700 ease-out",
          "bg-gradient-to-br from-card/80 via-card/60 to-card/80",
          "before:absolute before:inset-0 before:rounded-2xl before:padding-[1px]",
          "before:bg-gradient-to-br before:from-primary/30 before:via-transparent before:to-accent/30",
          isVisible && "animate-fade-in",
          hover && "hover:scale-[1.01] hover:shadow-xl group",
          glow && "shadow-[0_0_30px_hsl(var(--primary)/0.2)]",
          className
        )}
        style={{ animationDelay: `${delay}ms` }}
        {...props}
      >
        {/* Glass reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none group-hover:animate-glow-soft" />
        
        {/* Content */}
        <div className="relative z-10 group-hover:animate-float-slow transition-transform duration-700 ease-out">
          {children}
        </div>
      </div>
    );
  }
);
```

## Модальные окна Neumorphism

### Dialog с neumorphic стилем
```jsx
<Dialog>
  <DialogContent className="card-surface max-w-2xl">
    <DialogHeader>
      <DialogTitle className="text-2xl font-display text-gradient">
        Заголовок модального окна
      </DialogTitle>
    </DialogHeader>
    
    <div className="py-6">
      {/* Контент модального окна */}
    </div>
    
    <div className="flex gap-4 justify-end">
      <button className="btn-ghost">
        Отмена
      </button>
      <button className="btn-hero">
        Подтвердить
      </button>
    </div>
  </DialogContent>
</Dialog>
```

## Адаптивность Neumorphism

### Мобильная адаптация
```css
@media (max-width: 768px) {
  .card-surface {
    @apply p-4 rounded-2xl;
    box-shadow: 
      6px 6px 12px rgba(174, 187, 204, 0.4),
      -6px -6px 12px rgba(255, 255, 255, 0.4);
  }
  
  .btn-hero {
    @apply px-6 py-3 text-base;
  }
}
```

### Уменьшенные тени на мобильных
```css
@media (max-width: 640px) {
  :root {
    --shadow-raised: 
      6px 6px 12px rgba(174, 187, 204, 0.4),
      -6px -6px 12px rgba(255, 255, 255, 0.4);
  }
}
```

## Лучшие практики

### 1. Контрастность
- Обеспечивайте достаточный контраст между элементами
- Используйте цветные акценты для важных элементов
- Избегайте слишком тонких теней

### 2. Иерархия
```css
/* Базовый уровень */
.level-1 { box-shadow: var(--shadow-raised); }

/* Поднятый уровень */
.level-2 { box-shadow: var(--shadow-raised-hover); }

/* Выделенный уровень */
.level-3 { box-shadow: var(--shadow-raised-strong); }
```

### 3. Анимации
- Используйте мягкие переходы
- Избегайте резких изменений теней
- Добавляйте небольшие трансформации при hover

### 4. Доступность
```jsx
// Проверка prefers-reduced-motion
const respectsMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<div className={cn(
  "card-surface",
  !respectsMotion && "hover:animate-float-slow"
)}>
  Контент с уважением к настройкам пользователя
</div>
```

## Создание новых neumorphic компонентов

### Шаблон для нового компонента
```tsx
interface NeumorphicComponentProps {
  variant?: 'raised' | 'inset' | 'flat';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const NeumorphicComponent = ({
  variant = 'raised',
  size = 'md',
  children,
  className
}: NeumorphicComponentProps) => {
  const variantClasses = {
    raised: 'card-surface',
    inset: 'neumorphic-inset',
    flat: 'neumorphic-flat'
  };
  
  const sizeClasses = {
    sm: 'p-4 text-sm',
    md: 'p-6 text-base',
    lg: 'p-8 text-lg'
  };
  
  return (
    <div className={cn(
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
};
```