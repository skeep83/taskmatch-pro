# Hero Секции

## Типы Hero секций

### 1. Главная Hero секция (Index)
Полноэкранная секция с двухколоночным layout и интерактивными элементами.

#### Структура
```jsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  <div className="container mx-auto px-6 relative z-10">
    <div className="grid lg:grid-cols-2 gap-16 items-center">
      {/* Левая колонка - текст */}
      <div className="text-left lg:pr-8">
        {/* Контент */}
      </div>
      
      {/* Правая колонка - изображение */}
      <div className="relative animate-fade-in">
        {/* Hero изображение с floating cards */}
      </div>
    </div>
  </div>
</section>
```

#### Особенности дизайна

##### Бейдж с иконкой
```jsx
<div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
  <Rocket size={24} className="text-primary" />
  <span className="text-sm font-medium text-primary">Платформа нового поколения</span>
</div>
```

##### Градиентный заголовок
```jsx
<h1 className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight">
  <span className="text-gradient animate-gradient-shift">{t("hero.title")}</span>
</h1>
```

##### Trust indicators
```jsx
<div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground animate-fade-in">
  <div className="bg-white dark:bg-white/5 px-6 py-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center gap-3">
    <ShieldCheck size={24} className="text-green-500" />
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Безопасные платежи</span>
  </div>
  {/* Дополнительные индикаторы */}
</div>
```

#### Floating статистики
```jsx
{/* Floating Stats Cards */}
<div 
  className="card-surface absolute -top-6 -left-6 p-4 w-56"
  style={{ animationDelay: '600ms' }}
>
  <div className="text-center">
    <div className="text-3xl font-bold text-primary mb-1">25K+</div>
    <div className="text-sm text-muted-foreground">Выполненных заказов</div>
  </div>
</div>

<div 
  className="card-surface absolute -bottom-6 -right-6 p-4 w-56"
  style={{ animationDelay: '800ms' }}
>
  <div className="text-center">
    <div className="text-3xl font-bold text-accent mb-1">4.9★</div>
    <div className="text-sm text-muted-foreground">Средний рейтинг</div>
  </div>
</div>
```

### 2. Компактная Hero секция
Уменьшенная версия для внутренних страниц.

```jsx
<section className="relative py-20 overflow-hidden">
  <SignatureGradient />
  <div className="container mx-auto px-6 relative z-10 text-center">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl lg:text-6xl font-display font-bold mb-6">
        <span className="text-gradient">{title}</span>
      </h1>
      <p className="text-xl text-muted-foreground mb-8">
        {subtitle}
      </p>
    </div>
  </div>
</section>
```

### 3. Hero с формой
Hero секция с интегрированной формой поиска.

```jsx
<section className="relative min-h-screen flex items-center">
  <div className="container mx-auto px-6">
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-gradient mb-8">{title}</h1>
      
      {/* Форма поиска */}
      <div className="card-surface p-8 max-w-2xl mx-auto">
        <form className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Что нужно сделать?"
              className="w-full px-4 py-3 rounded-xl border border-muted bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button 
              type="submit"
              className="btn-hero w-full"
            >
              Найти специалиста
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</section>
```

## Фоновые эффекты

### SignatureGradient компонент
```jsx
export const SignatureGradient: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let x = 50, y = 30;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 100;
      const ny = ((e.clientY - rect.top) / rect.height) * 100;
      x = nx; y = ny;
      if (!raf) raf = requestAnimationFrame(update);
    };

    const update = () => {
      el.style.setProperty("--gx", `${x}%`);
      el.style.setProperty("--gy", `${y}%`);
      raf = 0;
    };

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mql.matches) el.addEventListener("mousemove", onMove);
    
    return () => {
      if (!mql.matches) el.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(600px circle at var(--gx,50%) var(--gy,30%), hsl(var(--brand-1)/0.25), transparent 60%), radial-gradient(800px circle at 80% 20%, hsl(var(--brand-2)/0.2), transparent 60%)",
        filter: "blur(0px)",
      }}
    />
  );
};
```

## CTA Buttons

### Основные кнопки
```jsx
{/* Основная CTA */}
<Link 
  to="/catalog" 
  className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
>
  🔍 Найти специалиста
</Link>

{/* Вторичная CTA */}
<Link 
  to="/auth" 
  className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
>
  💼 Стать исполнителем
</Link>
```

### Neumorphic кнопки
```jsx
<button className="btn-hero">
  Основное действие
</button>

<button className="btn-ghost">
  Второстепенное действие
</button>
```

## Анимации Hero секций

### Последовательная анимация элементов
```jsx
{/* Основной заголовок */}
<div className="mb-8 animate-fade-in">
  {content}
</div>

{/* CTA кнопки с задержкой */}
<div className="flex gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
  {buttons}
</div>

{/* Trust indicators с большей задержкой */}
<div className="flex gap-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
  {indicators}
</div>
```

### Floating анимация для изображений
```jsx
<img 
  src={heroDashboard} 
  alt="ServiceHub Platform" 
  className="w-full h-auto rounded-3xl shadow-2xl animate-float-slow"
  loading="eager"
  fetchPriority="high"
/>
```

## Адаптивность Hero секций

### Mobile layout
```jsx
<div className="grid lg:grid-cols-2 gap-16 items-center">
  {/* На мобильных - вертикальная колонка */}
  <div className="text-center lg:text-left lg:pr-8">
    <h1 className="text-4xl lg:text-7xl font-display font-bold">
      {/* Адаптивные размеры шрифтов */}
    </h1>
  </div>
</div>
```

### Responsive spacing
```jsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    {/* Адаптивные отступы */}
  </div>
</section>
```

## SEO оптимизация

### Structured data
```jsx
<Seo 
  title={t("seo.home.title")} 
  description={t("seo.home.desc")} 
  canonical="/" 
  jsonLd={{
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ServiceHub",
    url: "/",
    potentialAction: {
      "@type":"SearchAction",
      "target":"/catalog?q={search_term_string}",
      "query-input":"required name=search_term_string"
    }
  }} 
/>
```

### Семантическая разметка
```jsx
<main className="relative min-h-screen">
  <section role="banner" className="hero-section">
    <header>
      <h1>{mainTitle}</h1>
      <p>{subtitle}</p>
    </header>
    
    <nav aria-label="Main actions">
      {ctaButtons}
    </nav>
  </section>
</main>
```

## Производительность

### Оптимизация изображений
```jsx
<img 
  src={heroImage}
  alt="Hero image"
  loading="eager"          // Приоритетная загрузка
  fetchPriority="high"     // Высокий приоритет
  width="612"              // Явные размеры
  height="408"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 612px"
  decoding="sync"          // Синхронная декодировка
/>
```

### Предотвращение layout shift
```jsx
<div className="relative">
  <div className="aspect-[16/10] bg-muted rounded-3xl">
    {/* Placeholder для предотвращения CLS */}
    <img 
      className="w-full h-full object-cover rounded-3xl"
      {...imageProps}
    />
  </div>
</div>
```