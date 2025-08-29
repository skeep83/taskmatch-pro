# Спецификации Дизайна 3D Карусели

## Общий Дизайн

### Цветовая Схема
```css
/* Градиенты карточек */
background: linear-gradient(135deg, #f093fb 0%, #f5576c 25%, #4facfe 75%, #00f2fe 100%);
/* Альтернативные варианты */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
```

### Размеры и Пропорции
- **Контейнер карусели**: 700px высота, адаптивная ширина
- **Карточка**: Округлые углы 24px (rounded-3xl)
- **Аватар специалиста**: 128px x 128px с рамкой 4px белого цвета
- **Тень карточки**: shadow-2xl для глубины

## Структура Карточки

### 1. Верхняя Секция (Градиент)
```css
height: 128px; /* 32 * 0.25rem */
background: gradient-to-br from-pink-400 via-purple-500 to-indigo-600;
position: relative;
```

#### Декоративный Оверлей
```css
background: gradient-to-br from-transparent via-white/10 to-white/20;
position: absolute;
inset: 0;
```

### 2. Аватар (Перекрывающий)
```css
position: absolute;
left: 50%;
transform: translateX(-50%);
top: 64px; /* 16 * 0.25rem - половина высоты градиента */
z-index: 10;
```

#### Состояния Аватара
- **Hover эффект**: Scale 1.1 + rotate 5deg
- **Статус индикатор**: Зеленый круг с галочкой для выбранного специалиста
- **Fallback**: Инициалы на градиентном фоне

### 3. Нижняя Секция (Контент)
```css
background: white;
padding: 80px 24px 32px; /* pt-20 px-6 pb-8 */
```

#### Имя и Заголовок
```css
/* Имя */
font-weight: bold;
font-size: 1.25rem; /* text-xl */
color: #111827; /* text-gray-900 */
margin-bottom: 4px;

/* Подзаголовок */
font-size: 0.875rem; /* text-sm */
color: #6b7280; /* text-gray-500 */
text-transform: uppercase;
letter-spacing: 0.05em; /* tracking-wide */
font-weight: 500;
```

## Элементы Интерфейса

### Кнопки Навигации
```css
/* Основные кнопки */
width: 40px; /* w-10 */
height: 40px; /* h-10 */
border-radius: 50%; /* rounded-full */
padding: 0;
background: transparent;
border: none;

/* Hover состояние */
background: hsl(var(--muted));
```

### Индикаторы Прогресса
```css
/* Неактивная точка */
width: 12px; /* w-3 */
height: 12px; /* h-3 */
border-radius: 50%;
background: hsl(var(--muted));
transition: all 200ms;

/* Активная точка */
background: hsl(var(--primary));
transform: scale(1.25);
```

### Кнопки Действий
```css
/* Кнопка портфолио */
width: 100%;
border: 1px solid #e9d5ff; /* border-purple-200 */
color: #9333ea; /* text-purple-600 */
background: transparent;
padding: 8px 0; /* py-2 */
border-radius: 8px; /* rounded-lg */

/* Hover */
background: #faf5ff; /* hover:bg-purple-50 */

/* Основная кнопка */
width: 100%;
background: linear-gradient(to right, #ec4899, #9333ea); /* from-pink-500 to-purple-600 */
color: white;
font-weight: 600; /* font-semibold */
padding: 12px 0; /* py-3 */
border-radius: 12px; /* rounded-xl */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* shadow-lg */

/* Hover */
background: linear-gradient(to right, #db2777, #7c3aed); /* hover:from-pink-600 hover:to-purple-700 */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); /* hover:shadow-xl */
```

## Анимации и Переходы

### Анимация Входа Карточки
```css
/* Начальное состояние */
opacity: 0;
transform: translateX(100px) rotateY(15deg);

/* Конечное состояние */
opacity: 1;
transform: translateX(0) rotateY(0);

/* Параметры */
duration: 400ms;
easing: cubic-bezier(0.4, 0, 0.2, 1);
```

### Анимация Выхода Карточки
```css
/* Конечное состояние */
opacity: 0;
transform: translateX(-100px) rotateY(-15deg);

/* Параметры */
duration: 400ms;
easing: cubic-bezier(0.4, 0, 0.2, 1);
```

### 3D Эффекты
```css
/* Контейнер с перспективой */
perspective: 1000px;

/* Карточка с 3D трансформацией */
transform-style: preserve-3d;
backface-visibility: hidden;
```

## Адаптивность

### Мобильные Устройства
- Уменьшенные отступы
- Адаптированные размеры шрифтов
- Оптимизированная высота карточек

### Планшеты
- Средние размеры элементов
- Сохранение пропорций

### Десктоп
- Полные размеры и эффекты
- Расширенные hover состояния