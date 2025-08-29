# Адаптивные Сетки и Layouts

## Система Grid Layouts

### Основные принципы
- **Mobile-first**: Базовые стили для мобильных устройств
- **Прогрессивное улучшение**: Добавление колонок по мере увеличения экрана
- **Flex и Grid**: Комбинация CSS Grid и Flexbox для оптимальных результатов
- **Консистентные отступы**: Единообразие spacing между элементами

## Breakpoints

### Tailwind breakpoints
```css
/* sm */  @media (min-width: 640px) { ... }
/* md */  @media (min-width: 768px) { ... }
/* lg */  @media (min-width: 1024px) { ... }
/* xl */  @media (min-width: 1280px) { ... }
/* 2xl */ @media (min-width: 1536px) { ... }
```

### Container настройки
```css
.container {
  max-width: 100%;
  margin: 0 auto;
  padding: 0 1.5rem; /* px-6 */
}

@media (min-width: 640px) {
  .container { max-width: 640px; }
}

@media (min-width: 768px) {
  .container { max-width: 768px; }
}

@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}

@media (min-width: 1280px) {
  .container { max-width: 1280px; }
}

@media (min-width: 1536px) {
  .container { max-width: 1400px; }
}
```

## Grid Patterns

### 1. Hero Grid (2 колонки на lg+)
```jsx
<section className="container mx-auto px-6">
  <div className="grid lg:grid-cols-2 gap-16 items-center">
    {/* Левая колонка - текст */}
    <div className="text-center lg:text-left lg:pr-8">
      <h1 className="text-4xl lg:text-7xl font-display font-bold">
        Заголовок
      </h1>
      <p className="text-lg lg:text-xl text-muted-foreground">
        Описание
      </p>
    </div>
    
    {/* Правая колонка - изображение */}
    <div className="order-first lg:order-last">
      <img 
        src="/hero-image.jpg" 
        alt="Hero" 
        className="w-full h-auto rounded-3xl"
      />
    </div>
  </div>
</section>
```

### 2. Categories Grid (2-3-6 колонок)
```jsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
  {categories.map((category, index) => (
    <div key={category.id} className="card-surface p-6 text-center">
      <NeumorphicIcon 
        icon={category.icon} 
        size={80}
        className="mx-auto mb-4"
      />
      <h3 className="font-semibold">{category.name}</h3>
    </div>
  ))}
</div>
```

### 3. Features Grid (1-2-3 колонки)
```jsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
  {features.map((feature, index) => (
    <div key={feature.id} className="card-surface p-8">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
        <feature.icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
      <p className="text-muted-foreground">{feature.description}</p>
    </div>
  ))}
</div>
```

### 4. Testimonials Grid (1-3 колонки)
```jsx
<div className="grid md:grid-cols-3 gap-8">
  {testimonials.map((testimonial, index) => (
    <div key={index} className="card-surface p-8">
      <div className="flex items-center gap-1 mb-6">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-lg italic mb-6">"{testimonial.text}"</p>
      <div className="flex items-center gap-4">
        <img 
          src={testimonial.avatar} 
          alt={testimonial.author}
          className="w-12 h-12 rounded-full"
        />
        <div>
          <div className="font-semibold">{testimonial.author}</div>
          <div className="text-sm text-muted-foreground">{testimonial.location}</div>
        </div>
      </div>
    </div>
  ))}
</div>
```

## Адаптивные компоненты

### 1. ResponsiveGrid компонент
```tsx
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export const ResponsiveGrid = ({
  children,
  cols = { default: 1, md: 2, lg: 3 },
  gap = 6,
  className
}: ResponsiveGridProps) => {
  const gridClasses = [
    `grid`,
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    `gap-${gap}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

// Использование
<ResponsiveGrid 
  cols={{ default: 1, md: 2, lg: 4 }}
  gap={8}
>
  {items.map(item => (
    <div key={item.id} className="card-surface p-6">
      {item.content}
    </div>
  ))}
</ResponsiveGrid>
```

### 2. MasonryGrid для неравномерных карточек
```tsx
interface MasonryGridProps {
  children: React.ReactNode;
  cols?: number;
  gap?: number;
}

export const MasonryGrid = ({ 
  children, 
  cols = 3, 
  gap = 24 
}: MasonryGridProps) => {
  const [columns, setColumns] = useState<React.ReactNode[][]>([]);

  useEffect(() => {
    const childrenArray = React.Children.toArray(children);
    const newColumns: React.ReactNode[][] = Array.from({ length: cols }, () => []);
    
    childrenArray.forEach((child, index) => {
      const columnIndex = index % cols;
      newColumns[columnIndex].push(child);
    });
    
    setColumns(newColumns);
  }, [children, cols]);

  return (
    <div 
      className="flex"
      style={{ gap: `${gap}px` }}
    >
      {columns.map((column, index) => (
        <div 
          key={index}
          className="flex-1"
          style={{ gap: `${gap}px` }}
        >
          <div className="space-y-6">
            {column}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Специализированные Layout

### 1. Sidebar Layout
```jsx
<div className="min-h-screen bg-background-neomorphic">
  <div className="flex">
    {/* Sidebar */}
    <aside className="w-64 hidden lg:block">
      <div className="card-surface h-screen p-6 rounded-none">
        <nav className="space-y-2">
          {/* Навигация */}
        </nav>
      </div>
    </aside>
    
    {/* Main content */}
    <main className="flex-1 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {children}
      </div>
    </main>
  </div>
</div>
```

### 2. Dashboard Layout
```jsx
<div className="min-h-screen bg-background-neomorphic">
  {/* Header */}
  <header className="glass-nav p-4">
    <div className="container mx-auto flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        {/* User menu */}
      </div>
    </div>
  </header>
  
  {/* Main content */}
  <main className="container mx-auto px-6 py-8">
    {/* Stats row */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map(stat => (
        <div key={stat.id} className="card-surface p-6">
          <div className="text-3xl font-bold text-primary">{stat.value}</div>
          <div className="text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
    
    {/* Content grid */}
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        {/* Main content */}
      </div>
      <div>
        {/* Sidebar content */}
      </div>
    </div>
  </main>
</div>
```

### 3. Article Layout
```jsx
<article className="container mx-auto px-6 py-12">
  <div className="max-w-4xl mx-auto">
    {/* Header */}
    <header className="text-center mb-12">
      <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
        {title}
      </h1>
      <div className="flex items-center justify-center gap-6 text-muted-foreground">
        <time dateTime={publishedAt}>
          {formatDate(publishedAt)}
        </time>
        <span>•</span>
        <span>{readingTime} мин чтения</span>
      </div>
    </header>
    
    {/* Content */}
    <div className="prose prose-lg max-w-none">
      {content}
    </div>
  </div>
</article>
```

## Responsive Utilities

### 1. ResponsiveContainer
```tsx
interface ResponsiveContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
}

export const ResponsiveContainer = ({
  children,
  size = 'lg',
  padding = true
}: ResponsiveContainerProps) => {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none'
  };

  return (
    <div className={cn(
      'mx-auto',
      sizeClasses[size],
      padding && 'px-4 sm:px-6 lg:px-8'
    )}>
      {children}
    </div>
  );
};
```

### 2. ResponsiveText
```tsx
interface ResponsiveTextProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveText = ({
  as: Component = 'p',
  size = 'md',
  children,
  className
}: ResponsiveTextProps) => {
  const sizeClasses = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl lg:text-4xl',
    '3xl': 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl'
  };

  return (
    <Component className={cn(sizeClasses[size], className)}>
      {children}
    </Component>
  );
};
```

## Mobile-first подход

### 1. Стекирование на мобильных
```jsx
{/* Desktop: side-by-side, Mobile: stacked */}
<div className="flex flex-col lg:flex-row gap-8">
  <div className="lg:w-2/3">
    {/* Основной контент */}
  </div>
  <div className="lg:w-1/3">
    {/* Боковой контент */}
  </div>
</div>
```

### 2. Скрытие элементов на мобильных
```jsx
{/* Скрыто на мобильных, видно на планшетах+ */}
<div className="hidden md:block">
  Дополнительная информация
</div>

{/* Видно только на мобильных */}
<div className="block md:hidden">
  Мобильное меню
</div>
```

### 3. Изменение порядка элементов
```jsx
<div className="flex flex-col lg:flex-row">
  {/* Первый на мобильных, второй на десктопе */}
  <div className="order-1 lg:order-2 lg:w-1/2">
    Изображение
  </div>
  
  {/* Второй на мобильных, первый на десктопе */}
  <div className="order-2 lg:order-1 lg:w-1/2">
    Текст
  </div>
</div>
```

## Специальные Grid техники

### 1. Auto-fit Grid
```css
.auto-fit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

```jsx
<div className="auto-fit-grid">
  {items.map(item => (
    <div key={item.id} className="card-surface p-6">
      {item.content}
    </div>
  ))}
</div>
```

### 2. Span колонки
```jsx
<div className="grid grid-cols-12 gap-6">
  {/* Занимает всю ширину на мобильных, половину на планшетах, треть на десктопе */}
  <div className="col-span-12 md:col-span-6 lg:col-span-4">
    Контент 1
  </div>
  
  {/* Занимает 2/3 ширины на больших экранах */}
  <div className="col-span-12 lg:col-span-8">
    Контент 2
  </div>
</div>
```

### 3. Nested Grid
```jsx
<div className="grid lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    {/* Вложенная сетка */}
    <div className="grid md:grid-cols-2 gap-6">
      {items.map(item => (
        <div key={item.id} className="card-surface p-6">
          {item.content}
        </div>
      ))}
    </div>
  </div>
  
  <div className="card-surface p-6">
    Боковая панель
  </div>
</div>
```

## Performance оптимизации

### 1. Lazy loading для больших сеток
```tsx
const LazyGrid = ({ items, pageSize = 20 }) => {
  const [visibleItems, setVisibleItems] = useState(pageSize);
  const [isLoading, setIsLoading] = useState(false);
  
  const loadMore = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Симуляция загрузки
    setVisibleItems(prev => prev + pageSize);
    setIsLoading(false);
  }, [pageSize]);

  return (
    <div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.slice(0, visibleItems).map(item => (
          <div key={item.id} className="card-surface p-6">
            {item.content}
          </div>
        ))}
      </div>
      
      {visibleItems < items.length && (
        <div className="text-center mt-8">
          <button 
            onClick={loadMore}
            disabled={isLoading}
            className="btn-hero"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить еще'}
          </button>
        </div>
      )}
    </div>
  );
};
```

### 2. Виртуализация для очень больших списков
```tsx
import { FixedSizeGrid as Grid } from 'react-window';

const VirtualizedGrid = ({ items, itemWidth = 300, itemHeight = 200 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const columnCount = Math.floor(dimensions.width / itemWidth);
  const rowCount = Math.ceil(items.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex;
    const item = items[index];
    
    if (!item) return null;

    return (
      <div style={style} className="p-3">
        <div className="card-surface p-6 h-full">
          {item.content}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="h-96">
      {dimensions.width > 0 && (
        <Grid
          columnCount={columnCount}
          columnWidth={itemWidth}
          height={dimensions.height}
          rowCount={rowCount}
          rowHeight={itemHeight}
          width={dimensions.width}
        >
          {Cell}
        </Grid>
      )}
    </div>
  );
};
```