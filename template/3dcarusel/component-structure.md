# Структура Компонента 3D Карусели

## Архитектура

### Файл: `JobApplicationsList.tsx`
```
src/components/JobApplicationsList.tsx
├── Импорты и типы
├── Интерфейс пропсов
├── Основной компонент
│   ├── Хуки состояния
│   ├── Эффекты
│   ├── Вспомогательные функции
│   └── Рендер
└── Экспорт
```

## Импорты и Зависимости

```typescript
// React и анимации
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Supabase и хуки
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';

// UI компоненты
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Иконки
import { Clock, Shield, MessageSquare, CheckCircle, User, ExternalLink, 
         Image, ChevronLeft, ChevronRight, Star, Eye } from 'lucide-react';

// Утилиты
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Link } from 'react-router-dom';
import { JobStatusProgress } from '@/components/JobStatusProgress';
```

## Типы и Интерфейсы

```typescript
interface JobApplication {
  id: string;
  price_cents: number;
  eta_slot?: string;
  note?: string;
  warranty_days?: number;
  created_at: string;
  pro_id: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  proProfile?: {
    bio?: string;
    hourly_rate_cents?: number;
    fixed_price_cents?: number;
    radius_km?: number;
  };
  rating?: {
    avg_score: number;
    rating_count: number;
  };
  portfolio?: Array<{
    id: string;
    image_url: string;
    title?: string;
    portfolio_media?: Array<{
      id: string;
      file_url: string;
      file_type: string;
      display_order: number;
      file_name?: string;
    }>;
  }>;
}

interface JobApplicationsListProps {
  jobId: string;
  jobStatus: string;
  selectedProId?: string;
  onApplicationSelect: () => void;
}
```

## Хуки Состояния

```typescript
const [applications, setApplications] = useState<JobApplication[]>([]);
const [loading, setLoading] = useState(true);
const [selecting, setSelecting] = useState<string | null>(null);
const [currentIndex, setCurrentIndex] = useState(0);
const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
const [selectedPortfolio, setSelectedPortfolio] = useState<JobApplication | null>(null);
const [currentImageIndex, setCurrentImageIndex] = useState(0);
const [allPortfolioImages, setAllPortfolioImages] = useState<any[]>([]);
const { formatPrice } = useCurrency();
const { toast } = useToast();
```

## Эффекты

### 1. Загрузка Данных
```typescript
useEffect(() => {
  if (jobId) {
    fetchApplications();
  }
}, [jobId]);
```

### 2. Real-time Подписки
```typescript
useEffect(() => {
  if (!jobId) return;

  const channel = supabase
    .channel(`job-applications-${jobId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'job_applications',
      filter: `job_id=eq.${jobId}`
    }, () => fetchApplications())
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'job_price_proposals',
      filter: `job_id=eq.${jobId}`
    }, () => fetchApplications())
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [jobId]);
```

## Основные Функции

### 1. Получение Данных
```typescript
const fetchApplications = async () => {
  // Параллельные запросы к базе данных
  // Обогащение данными профилей
  // Обработка ошибок
  // Установка состояния
};
```

### 2. Выбор Специалиста
```typescript
const handleSelectProfessional = async (proId: string) => {
  // Обновление статуса заказа
  // Показ уведомления
  // Вызов колбека
};
```

### 3. Управление Портфолио
```typescript
const handlePortfolioOpen = (application: JobApplication) => {
  // Сбор изображений
  // Открытие модального окна
  // Сброс индексов
};
```

## Структура Рендера

```typescript
return (
  <div className="space-y-6">
    {/* Заголовок с счетчиком */}
    <div className="flex items-center justify-between">
      <h3>Отклики ({applications.length})</h3>
      <div>Текущая карточка: {currentIndex + 1} / {applications.length}</div>
    </div>
    
    {/* Контейнер карусели */}
    <div className="relative w-full max-w-lg mx-auto h-[700px]">
      <AnimatePresence mode="wait">
        {applications.map((application, index) => (
          // Карточка отклика
        ))}
      </AnimatePresence>
    </div>

    {/* Навигация */}
    <div className="flex items-center justify-center gap-6 py-4">
      {/* Кнопки и индикаторы */}
    </div>

    {/* Модальное окно портфолио */}
    <Dialog open={portfolioModalOpen} onOpenChange={setPortfolioModalOpen}>
      {/* Альбом с каруселью */}
    </Dialog>
  </div>
);
```

## Анимационные Компоненты

### 1. Карточка Отклика
```typescript
<motion.div
  key={application.id}
  initial={{ opacity: 0, x: 100, rotateY: 15 }}
  animate={{ opacity: 1, x: 0, rotateY: 0 }}
  exit={{ opacity: 0, x: -100, rotateY: -15 }}
  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
  className="absolute inset-0 perspective-1000"
>
  {/* Содержимое карточки */}
</motion.div>
```

### 2. Аватар
```typescript
<motion.div
  whileHover={{ scale: 1.1, rotate: 5 }}
  transition={{ duration: 0.2 }}
>
  <Avatar className="w-32 h-32 ring-4 ring-white shadow-xl">
    {/* Аватар специалиста */}
  </Avatar>
</motion.div>
```

### 3. Изображения Портфолио
```typescript
<motion.div
  key={currentImageIndex}
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
>
  {/* Основное изображение */}
</motion.div>
```

## Условная Логика Рендера

### 1. Состояние Загрузки
```typescript
if (loading) {
  return <div className="text-center py-8">Загрузка откликов...</div>;
}
```

### 2. Пустой Список
```typescript
if (applications.length === 0) {
  return (
    <Card>
      <CardContent className="text-center py-8">
        {/* Пустое состояние */}
      </CardContent>
    </Card>
  );
}
```

### 3. Назначенный Специалист
```typescript
if (selectedProId) {
  return (
    <div className="space-y-6">
      {/* Статус выполнения и советы */}
    </div>
  );
}
```

## Оптимизация

### 1. Мемоизация
- Использование `useMemo` для тяжелых вычислений
- `useCallback` для функций-обработчиков

### 2. Ленивая Загрузка
- `OptimizedImage` для изображений
- Условный рендер невидимых карточек

### 3. Управление Подписками
- Автоматическая очистка каналов
- Дебаунсинг обновлений