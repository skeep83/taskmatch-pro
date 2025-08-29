# Контентные Секции

## Типы контентных секций

### 1. Секция категорий
Сетка категорий с neumorphic иконками и hover эффектами.

#### Базовая структура
```jsx
<section className="container mx-auto py-24 px-6">
  <div className="text-center mb-16">
    <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
      {t("section.categories")}
    </h2>
    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
      Найдите нужного специалиста в любой сфере
    </p>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
    {categories.map((category, index) => (
      <CategoryCard key={category.key} category={category} index={index} />
    ))}
  </div>
</section>
```

#### Карточка категории
```jsx
const CategoryCard = ({ category, index }) => {
  const IconComponent = iconsByKey[category.key] || Sparkles;
  
  return (
    <div 
      className="card-surface p-6 text-center cursor-pointer group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="mb-4">
        <NeumorphicIcon 
          icon={IconComponent} 
          size={112}
          variant="square"
          className="group-hover:scale-110 transition-transform mx-auto" 
          delayMs={index * 100}
        />
      </div>
      <div className="font-semibold group-hover:text-primary transition-colors">
        {category.label}
      </div>
    </div>
  );
};
```

### 2. Секция отзывов
Анимированная смена карточек отзывов с автоматической ротацией.

#### Структура с анимацией
```jsx
<section className="container mx-auto py-24 px-6">
  <div className="text-center mb-16">
    <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
      {t("section.testimonials")}
    </h2>
    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
      Отзывы наших довольных клиентов
    </p>
  </div>

  <div className="grid md:grid-cols-3 gap-8">
    {currentTestimonials.map((testimonial, index) => (
      <TestimonialCard 
        key={`testimonial-${index}-${testimonial.author}`}
        testimonial={testimonial}
        index={index}
        isAnimating={animatingCards[index]}
      />
    ))}
  </div>
</section>
```

#### Карточка отзыва
```jsx
const TestimonialCard = ({ testimonial, index, isAnimating }) => (
  <div 
    className={`card-surface p-8 text-left transform transition-all duration-1000 ease-in-out ${
      isAnimating
        ? 'opacity-0 translate-y-8 scale-95' 
        : 'opacity-100 translate-y-0 scale-100'
    }`}
    style={{ 
      transitionDelay: `${index * 300}ms`
    }}
  >
    {/* Рейтинг звездочками */}
    <div className="flex items-center gap-1 mb-6">
      {[...Array(testimonial.rating)].map((_, i) => (
        <Star 
          key={i} 
          size={20}
          className="text-amber-400 fill-amber-400"
        />
      ))}
    </div>
    
    {/* Текст отзыва */}
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

#### Логика автоматической ротации
```jsx
// Автоматическая смена отзывов с разными интервалами
useEffect(() => {
  const filteredTestimonials = testimonials.filter(t => t.lang === language);
  if (filteredTestimonials.length <= 3) return;

  const intervals: NodeJS.Timeout[] = [];

  [0, 1, 2].forEach((cardIndex) => {
    const interval = setInterval(() => {
      // Запуск анимации исчезновения
      setAnimatingCards(prev => {
        const newState = [...prev];
        newState[cardIndex] = true;
        return newState;
      });

      setTimeout(() => {
        // Замена отзыва
        setCurrentTestimonials(prev => {
          const newTestimonials = [...prev];
          const availableTestimonials = filteredTestimonials.filter(
            (t, index) => !prev.some(current => current.author === t.author)
          );
          
          if (availableTestimonials.length > 0) {
            const randomTestimonial = availableTestimonials[
              Math.floor(Math.random() * availableTestimonials.length)
            ];
            newTestimonials[cardIndex] = randomTestimonial;
          }
          
          return newTestimonials;
        });

        // Анимация появления
        setTimeout(() => {
          setAnimatingCards(prev => {
            const newState = [...prev];
            newState[cardIndex] = false;
            return newState;
          });
        }, 200);
      }, 800);
      
    }, 13000 + (cardIndex * 4000)); // Разные интервалы: 13s, 17s, 21s

    intervals.push(interval);
  });

  return () => intervals.forEach(clearInterval);
}, [language]);
```

### 3. Секция статистики
Числовые показатели с анимированными счетчиками.

```jsx
<section className="py-20 bg-muted/30">
  <div className="container mx-auto px-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((stat, index) => (
        <div 
          key={stat.label}
          className="text-center animate-fade-in"
          style={{ animationDelay: `${index * 200}ms` }}
        >
          <div className="text-5xl font-bold text-primary mb-2">
            <CountUp end={stat.value} duration={2.5} />
            {stat.suffix}
          </div>
          <div className="text-lg text-muted-foreground">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

### 4. Секция возможностей (Features)
Сетка преимуществ с иконками и описаниями.

```jsx
<section className="container mx-auto py-24 px-6">
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    {features.map((feature, index) => (
      <div 
        key={feature.id}
        className="card-surface p-8 text-center group hover:scale-105 transition-transform"
        style={{ animationDelay: `${index * 150}ms` }}
      >
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
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
    ))}
  </div>
</section>
```

## Заголовки секций

### Стандартный заголовок
```jsx
<div className="text-center mb-16">
  <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
    {title}
  </h2>
  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
    {subtitle}
  </p>
</div>
```

### Заголовок с бейджем
```jsx
<div className="text-center mb-16">
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
    <Star size={20} className="text-accent" />
    <span className="text-sm font-medium text-accent">Популярное</span>
  </div>
  
  <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
    {title}
  </h2>
  
  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
    {subtitle}
  </p>
</div>
```

## Специальные секции

### 1. Секция "Как это работает"
Пошаговый процесс с номерами и соединительными линиями.

```jsx
<section className="py-24 bg-background">
  <div className="container mx-auto px-6">
    <div className="text-center mb-16">
      <h2 className="text-4xl font-display font-bold mb-6 text-gradient">
        Как это работает
      </h2>
    </div>

    <div className="grid md:grid-cols-3 gap-8 relative">
      {/* Соединительные линии */}
      <div className="hidden md:block absolute top-16 left-1/4 w-1/2 h-0.5 bg-gradient-to-r from-primary to-accent"></div>
      
      {steps.map((step, index) => (
        <div key={step.id} className="text-center relative">
          {/* Номер шага */}
          <div className="w-16 h-16 mx-auto mb-6 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold">
            {index + 1}
          </div>
          
          <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
          <p className="text-muted-foreground">{step.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

### 2. CTA секция
Призыв к действию с фоновым градиентом.

```jsx
<section className="py-20 relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-shift"></div>
  <div className="absolute inset-0 bg-black/20"></div>
  
  <div className="container mx-auto px-6 relative z-10 text-center">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-4xl font-display font-bold text-white mb-6">
        Готовы начать?
      </h2>
      <p className="text-xl text-white/90 mb-8">
        Присоединяйтесь к тысячам довольных клиентов
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button className="bg-white text-primary px-8 py-4 rounded-xl font-semibold hover:bg-white/90 transition-colors">
          Начать сейчас
        </button>
        <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors">
          Узнать больше
        </button>
      </div>
    </div>
  </div>
</section>
```

## Адаптивные сетки

### Категории (2-3-6 колонок)
```jsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
  {/* На мобильных: 2 колонки
      На планшетах: 3 колонки  
      На десктопе: 6 колонок */}
</div>
```

### Возможности (1-2-3 колонки)
```jsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
  {/* На мобильных: 1 колонка
      На планшетах: 2 колонки
      На десктопе: 3 колонки */}
</div>
```

### Отзывы (1-3 колонки)
```jsx
<div className="grid md:grid-cols-3 gap-8">
  {/* На мобильных: 1 колонка
      На планшетах+: 3 колонки */}
</div>
```

## Анимации контентных секций

### Последовательная анимация
```jsx
{items.map((item, index) => (
  <div 
    key={item.id}
    className="animate-fade-in"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    {/* Контент */}
  </div>
))}
```

### Группированная анимация
```jsx
<div className="grid grid-cols-3 gap-8">
  {items.map((item, index) => (
    <div 
      key={item.id}
      className="animate-scale-in"
      style={{ 
        animationDelay: `${Math.floor(index / 3) * 200 + (index % 3) * 100}ms` 
      }}
    >
      {/* Контент */}
    </div>
  ))}
</div>
```

## Интерактивные элементы

### Hover эффекты для карточек
```jsx
<div className="card-surface group cursor-pointer">
  <div className="group-hover:scale-110 transition-transform">
    {/* Контент с увеличением */}
  </div>
  
  <div className="group-hover:text-primary transition-colors">
    {/* Контент с изменением цвета */}
  </div>
</div>
```

### Параллакс эффекты
```jsx
const [scrollY, setScrollY] = useState(0);

useEffect(() => {
  const handleScroll = () => setScrollY(window.scrollY);
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

return (
  <div 
    className="transform transition-transform"
    style={{ 
      transform: `translateY(${scrollY * 0.5}px)` 
    }}
  >
    {/* Контент с параллакс эффектом */}
  </div>
);
```