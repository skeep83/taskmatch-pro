# Карточные Компоненты

## Типы карточек

### 1. Card Surface - основная карточка
Базовая neumorphic карточка с выпуклыми тенями.

#### CSS класс
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

#### Использование
```jsx
<div className="card-surface">
  <h3 className="text-xl font-semibold mb-4">Заголовок</h3>
  <p className="text-muted-foreground">Описание содержимого карточки</p>
</div>
```

### 2. Glass Surface - стеклянная карточка
Карточка с эффектом матового стекла.

```jsx
<div className="glass-surface">
  <div className="relative z-10">
    <h3 className="text-xl font-semibold mb-4">Стеклянная карточка</h3>
    <p className="text-muted-foreground">Контент с backdrop-blur эффектом</p>
  </div>
</div>
```

### 3. FloatingCard - плавающая карточка
Анимированная карточка с градиентными границами.

```jsx
import { FloatingCard } from "@/components/ui/floating-card";

<FloatingCard 
  delay={200}
  hover={true}
  glow={true}
  className="p-6"
>
  <div className="text-center">
    <Award className="w-12 h-12 text-primary mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">Премиум качество</h3>
    <p className="text-sm text-muted-foreground">
      Проверенные специалисты с высоким рейтингом
    </p>
  </div>
</FloatingCard>
```

### 4. NeumorphicIcon - иконочная карточка
Карточка специально для иконок с neumorphic эффектом.

```jsx
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";

<NeumorphicIcon 
  icon={Wrench}
  size={112}
  variant="square"
  className="group-hover:scale-110 transition-transform mx-auto"
  delayMs={100}
/>
```

## Варианты карточек

### 1. Карточка категории
```jsx
const CategoryCard = ({ category, index }) => (
  <div 
    className="card-surface p-6 text-center cursor-pointer group"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="mb-4">
      <NeumorphicIcon 
        icon={category.icon} 
        size={80}
        variant="square"
        className="group-hover:scale-110 transition-transform mx-auto" 
      />
    </div>
    <div className="font-semibold group-hover:text-primary transition-colors">
      {category.label}
    </div>
  </div>
);
```

### 2. Карточка отзыва
```jsx
const TestimonialCard = ({ testimonial, isAnimating = false }) => (
  <div 
    className={`card-surface p-8 text-left transform transition-all duration-1000 ease-in-out ${
      isAnimating
        ? 'opacity-0 translate-y-8 scale-95' 
        : 'opacity-100 translate-y-0 scale-100'
    }`}
  >
    {/* Рейтинг */}
    <div className="flex items-center gap-1 mb-6">
      {[...Array(testimonial.rating)].map((_, i) => (
        <Star 
          key={i} 
          size={20}
          className="text-amber-400 fill-amber-400"
        />
      ))}
    </div>
    
    {/* Текст */}
    <p className="text-foreground/80 mb-6 leading-relaxed text-lg italic">
      "{testimonial.text}"
    </p>
    
    {/* Автор */}
    <div className="flex items-center gap-4">
      <img 
        src={testimonial.avatar} 
        alt={testimonial.author}
        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
      />
      <div>
        <div className="font-semibold text-primary text-lg">
          {testimonial.author}
        </div>
        <div className="text-sm text-muted-foreground">
          {testimonial.location}
        </div>
      </div>
    </div>
  </div>
);
```

### 3. Карточка статистики
```jsx
const StatsCard = ({ stat, delay = 0 }) => (
  <div 
    className="card-surface p-6 text-center animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="text-4xl font-bold text-primary mb-2">
      {stat.value}
      {stat.suffix}
    </div>
    <div className="text-lg text-muted-foreground">
      {stat.label}
    </div>
  </div>
);
```

### 4. Карточка возможности
```jsx
const FeatureCard = ({ feature, index }) => (
  <div 
    className="card-surface p-8 text-center group hover:scale-105 transition-transform"
    style={{ animationDelay: `${index * 150}ms` }}
  >
    <div className="mb-6">
      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
        <feature.icon className="w-8 h-8 text-primary" />
      </div>
    </div>
    
    <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">
      {feature.title}
    </h3>
    
    <p className="text-muted-foreground leading-relaxed">
      {feature.description}
    </p>
  </div>
);
```

## 3D карточки

### 3D трансформации
```jsx
<div className="card-3d perspective-1000">
  <div className="card-surface transform-gpu">
    {/* Контент карточки */}
  </div>
</div>
```

### CSS для 3D эффектов
```css
.perspective-1000 {
  perspective: 1000px;
}

.card-3d {
  transform-style: preserve-3d;
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card-3d:hover {
  transform: translateY(-12px) rotateX(8deg) rotateY(3deg) scale(1.03);
}

.shadow-3xl {
  box-shadow: 
    0 35px 60px -12px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```

## Карточки для специальных случаев

### 1. Карточка уведомления
```jsx
const NotificationCard = ({ notification, onClose }) => (
  <div className="card-surface p-4 flex items-center gap-4 animate-slide-in-right">
    <div className={`w-3 h-3 rounded-full ${
      notification.type === 'success' ? 'bg-green-500' :
      notification.type === 'warning' ? 'bg-amber-500' :
      notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`} />
    
    <div className="flex-1">
      <p className="font-medium">{notification.title}</p>
      <p className="text-sm text-muted-foreground">{notification.message}</p>
    </div>
    
    <button
      onClick={onClose}
      className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
    >
      <X size={16} />
    </button>
  </div>
);
```

### 2. Карточка загрузки
```jsx
const LoadingCard = () => (
  <div className="card-surface p-8">
    <div className="animate-pulse space-y-4">
      <div className="w-16 h-16 bg-muted rounded-2xl mx-auto"></div>
      <div className="h-4 bg-muted rounded-lg"></div>
      <div className="h-3 bg-muted rounded-lg w-3/4 mx-auto"></div>
    </div>
  </div>
);
```

### 3. Карточка с действиями
```jsx
const ActionCard = ({ title, description, actions }) => (
  <div className="card-surface p-6">
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    
    <div className="flex gap-2 justify-end">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            action.variant === 'primary' 
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  </div>
);
```

## Композиция карточек

### 1. Карточка с заголовком и подвалом
```jsx
const Card = ({ header, children, footer }) => (
  <div className="card-surface overflow-hidden">
    {header && (
      <div className="border-b border-border p-6 bg-muted/30">
        {header}
      </div>
    )}
    
    <div className="p-6">
      {children}
    </div>
    
    {footer && (
      <div className="border-t border-border p-6 bg-muted/30">
        {footer}
      </div>
    )}
  </div>
);
```

### 2. Карточка с медиа
```jsx
const MediaCard = ({ image, title, description, actions }) => (
  <div className="card-surface overflow-hidden">
    <div className="aspect-video relative">
      <img 
        src={image.src}
        alt={image.alt}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </div>
    
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      
      <div className="flex gap-2">
        {actions}
      </div>
    </div>
  </div>
);
```

## Анимации карточек

### Появление карточек
```jsx
const AnimatedCard = ({ children, delay = 0, ...props }) => (
  <div 
    className="animate-fade-in card-surface"
    style={{ animationDelay: `${delay}ms` }}
    {...props}
  >
    {children}
  </div>
);
```

### Последовательная анимация
```jsx
{cards.map((card, index) => (
  <AnimatedCard
    key={card.id}
    delay={index * 100}
    className="hover:scale-105 transition-transform"
  >
    {/* Контент карточки */}
  </AnimatedCard>
))}
```

### Hover анимации
```jsx
<div className="card-surface group">
  <div className="group-hover:animate-float-slow transition-transform">
    {/* Контент с анимацией парения */}
  </div>
  
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    {/* Скрытый контент при hover */}
  </div>
</div>
```

## Адаптивные карточки

### Изменение размеров на разных экранах
```jsx
<div className="card-surface p-4 md:p-6 lg:p-8">
  <h3 className="text-lg md:text-xl lg:text-2xl font-semibold">
    {/* Адаптивный заголовок */}
  </h3>
</div>
```

### Изменение layout на мобильных
```jsx
<div className="card-surface">
  <div className="flex flex-col md:flex-row gap-4 md:gap-6">
    <div className="md:w-1/3">
      {/* Изображение или иконка */}
    </div>
    <div className="md:w-2/3">
      {/* Контент */}
    </div>
  </div>
</div>
```

## Доступность карточек

### ARIA атрибуты
```jsx
<div 
  className="card-surface cursor-pointer"
  role="button"
  tabIndex={0}
  aria-label={`Открыть ${title}`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick();
    }
  }}
>
  {/* Контент карточки */}
</div>
```

### Фокус состояния
```jsx
<div className="card-surface focus:ring-2 focus:ring-primary focus:outline-none">
  {/* Контент с кольцом фокуса */}
</div>
```