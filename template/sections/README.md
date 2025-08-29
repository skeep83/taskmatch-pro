# Секции Сайта ServiceHub

## Описание
Документация всех типов секций, используемых на сайте ServiceHub, с их дизайном, эффектами и функциональностью. Все секции построены на основе neumorphism дизайна с градиентами и современными анимациями.

## Структура файлов
```
template/sections/
├── README.md                # Общее описание всех секций
├── hero-sections.md         # Hero секции с различными стилями
├── content-sections.md      # Контентные секции (категории, отзывы и т.д.)
├── card-components.md       # Карточные компоненты и их варианты
├── effects-animations.md    # Все эффекты и анимации
├── neumorphism-design.md    # Система neumorphism дизайна
└── responsive-grid.md       # Адаптивные сетки и layouts
```

## Основные принципы дизайна

### 1. Neumorphism стиль
- **Фон**: Серо-голубой (`hsl(220, 16%, 93%)`)
- **Тени**: Двойные тени (выпуклые и вогнутые)
- **Градиенты**: Мягкие переходы с использованием фирменных цветов
- **Скругления**: Большие радиусы (`rounded-3xl`, `rounded-2xl`)

### 2. Цветовая схема
```css
--primary: 258 80% 50%;     /* Индиго-фиолетовый */
--accent: 199 89% 48%;      /* Циан */
--brand-3: 280 72% 60%;     /* Пурпурный */
```

### 3. Анимации
- **Плавность**: Cubic-bezier кривые для естественного движения
- **Hover эффекты**: Scale, translate, glow
- **Загрузочные**: Fade-in с задержкой
- **Интерактивные**: Float, pulse, gradient-shift

## Типы секций

### 1. Hero секции
- Полноэкранные секции с центрированным контентом
- Градиентный фон с интерактивными эффектами
- Floating карточки со статистикой
- CTA кнопки с neumorphic стилем

### 2. Контентные секции
- Категории с иконками в neumorphic контейнерах
- Отзывы с анимированной сменой карточек
- Статистики с градиентными акцентами

### 3. Навигационные элементы
- Стеклянная навигация с backdrop-blur
- Floating action buttons
- Sidebar с темной/светлой темой

## Компонентная архитектура

### Базовые классы
```css
.card-surface       /* Основные карточки */
.glass-surface      /* Стеклянные элементы */
.acrylic-surface    /* Матовые поверхности */
.glass-nav          /* Навигация */
```

### Утилитные классы
```css
.text-gradient      /* Градиентный текст */
.hover-scale        /* Анимация при наведении */
.hover-float        /* Парящий эффект */
.story-link         /* Анимированные ссылки */
```

## Технологии
- **React 18** с TypeScript
- **Tailwind CSS** с кастомными утилитами
- **Framer Motion** для сложных анимаций
- **CSS Custom Properties** для динамических значений

## Структура контейнеров
```jsx
<main className="relative min-h-screen overflow-hidden">
  <SignatureGradient />  {/* Интерактивный фон */}
  
  <section className="relative min-h-screen flex items-center">
    <div className="container mx-auto px-6 relative z-10">
      {/* Контент секции */}
    </div>
  </section>
</main>
```

## Принципы адаптивности
- **Mobile-first**: Базовые стили для мобильных
- **Breakpoints**: sm, md, lg, xl, 2xl
- **Flexible grids**: CSS Grid и Flexbox
- **Responsive typography**: Clamp для размеров шрифтов

## SEO оптимизация
- Семантические HTML теги
- Правильная иерархия заголовков
- Alt атрибуты для изображений
- Structured data (JSON-LD)

## Производительность
- Lazy loading для изображений
- CSS-in-JS минимизация
- GPU ускорение для анимаций
- Prefers-reduced-motion поддержка