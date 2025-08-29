# Руководство по Интеграции 3D Карусели

## Предварительные Требования

### Зависимости
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "framer-motion": "^12.23.12",
    "@supabase/supabase-js": "^2.54.0",
    "lucide-react": "^0.462.0",
    "date-fns": "^3.6.0",
    "tailwindcss": "^3.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  }
}
```

### Настройка Tailwind CSS
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      perspective: {
        '1000': '1000px',
      },
      transformStyle: {
        'preserve-3d': 'preserve-3d',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      }
    }
  },
  plugins: []
};
```

## Структура Базы Данных

### Необходимые Таблицы
```sql
-- Профили пользователей
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Профили специалистов
CREATE TABLE pro_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  bio TEXT,
  hourly_rate_cents INTEGER,
  fixed_price_cents INTEGER,
  radius_km INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Отклики на заказы
CREATE TABLE job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  pro_id UUID REFERENCES auth.users NOT NULL,
  price_cents INTEGER,
  eta_slot TEXT,
  note TEXT,
  warranty_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Предложения цен
CREATE TABLE job_price_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  pro_id UUID REFERENCES auth.users NOT NULL,
  price_cents INTEGER NOT NULL,
  warranty_days INTEGER DEFAULT 30,
  eta_slot TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Портфолио
CREATE TABLE portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID REFERENCES auth.users NOT NULL,
  title TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Медиа файлы портфолио
CREATE TABLE portfolio_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_item_id UUID REFERENCES portfolio_items NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Рейтинги
CREATE TABLE ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  from_user_id UUID REFERENCES auth.users NOT NULL,
  to_user_id UUID REFERENCES auth.users NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Установка и Настройка

### 1. Копирование Компонента
```bash
# Скопировать основной компонент
cp template/3dcarusel/JobApplicationsList.tsx src/components/

# Если используете дополнительные компоненты
cp template/3dcarusel/components/* src/components/ui/
```

### 2. Настройка Supabase
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### 3. Настройка Хуков
```typescript
// src/hooks/useCurrency.ts
export const useCurrency = () => {
  const formatPrice = (cents: number, currency = 'USD') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  return { formatPrice };
};

// src/hooks/use-toast.ts
export const useToast = () => {
  const toast = ({ title, description, variant = 'default' }) => {
    // Ваша реализация уведомлений
    console.log({ title, description, variant });
  };

  return { toast };
};
```

## Базовое Использование

### Импорт и Использование
```typescript
import React from 'react';
import { JobApplicationsList } from '@/components/JobApplicationsList';

const JobDetailPage = ({ jobId, jobStatus, selectedProId }) => {
  const handleApplicationSelect = () => {
    // Обработка выбора специалиста
    console.log('Специалист выбран');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Детали заказа</h1>
      
      <JobApplicationsList
        jobId={jobId}
        jobStatus={jobStatus}
        selectedProId={selectedProId}
        onApplicationSelect={handleApplicationSelect}
      />
    </div>
  );
};

export default JobDetailPage;
```

### Пропсы Компонента
```typescript
interface JobApplicationsListProps {
  jobId: string;                    // Обязательный: ID заказа
  jobStatus: string;                // Обязательный: Статус заказа ('new', 'accepted', 'in_progress', 'done')
  selectedProId?: string;           // Опциональный: ID выбранного специалиста
  onApplicationSelect: () => void;  // Обязательный: Колбек при выборе специалиста
}
```

## Кастомизация

### 1. Изменение Стилей
```typescript
// Переопределение классов Tailwind
const customCardClasses = {
  container: "w-full max-w-md mx-auto h-[600px]", // Изменить размер
  card: "bg-gradient-to-br from-blue-400 to-purple-600", // Другой градиент
  avatar: "w-24 h-24", // Меньший аватар
};
```

### 2. Кастомные Анимации
```typescript
const customAnimations = {
  cardVariants: {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -50, scale: 0.9 }
  },
  transition: {
    duration: 0.5,
    ease: "easeInOut"
  }
};
```

### 3. Дополнительные Поля
```typescript
// Расширение интерфейса для дополнительных данных
interface ExtendedJobApplication extends JobApplication {
  specialty?: string;
  experience_years?: number;
  certificates?: string[];
  availability_status?: 'available' | 'busy' | 'offline';
}
```

## Интеграция с Роутингом

### React Router
```typescript
import { useParams, useNavigate } from 'react-router-dom';

const JobPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  
  const handleApplicationSelect = () => {
    // Перенаправление или обновление URL
    navigate(`/job/${jobId}/progress`);
  };

  return (
    <JobApplicationsList
      jobId={jobId!}
      jobStatus="new"
      onApplicationSelect={handleApplicationSelect}
    />
  );
};
```

### Next.js
```typescript
import { useRouter } from 'next/router';

const JobPage = () => {
  const router = useRouter();
  const { jobId } = router.query;

  const handleApplicationSelect = () => {
    router.push(`/job/${jobId}/progress`);
  };

  return (
    <JobApplicationsList
      jobId={jobId as string}
      jobStatus="new"
      onApplicationSelect={handleApplicationSelect}
    />
  );
};
```

## Обработка Ошибок

### Error Boundary
```typescript
import React from 'react';

class JobApplicationsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('JobApplicationsList Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-8">
          <h3>Что-то пошло не так</h3>
          <p>Не удалось загрузить отклики</p>
          <button onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Использование
<JobApplicationsErrorBoundary>
  <JobApplicationsList {...props} />
</JobApplicationsErrorBoundary>
```

## Тестирование

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { JobApplicationsList } from './JobApplicationsList';

describe('JobApplicationsList', () => {
  const defaultProps = {
    jobId: 'test-job-id',
    jobStatus: 'new',
    onApplicationSelect: jest.fn(),
  };

  test('отображает загрузку', () => {
    render(<JobApplicationsList {...defaultProps} />);
    expect(screen.getByText('Загрузка откликов...')).toBeInTheDocument();
  });

  test('отображает пустое состояние', async () => {
    // Мокирование Supabase запроса
    jest.mock('@/integrations/supabase/client', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          })
        })
      }
    }));

    render(<JobApplicationsList {...defaultProps} />);
    
    await screen.findByText('Пока нет откликов');
  });
});
```

## Развертывание

### Переменные Окружения
```bash
# .env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Проверка Готовности
```typescript
// Чеклист перед развертыванием
const deploymentChecklist = [
  'Настроены все переменные окружения',
  'Созданы необходимые таблицы в базе данных',
  'Настроены RLS политики',
  'Установлены все зависимости',
  'Протестированы основные сценарии',
  'Оптимизированы изображения',
  'Настроено кэширование',
  'Добавлены error boundaries'
];
```

## Часто Возникающие Проблемы

### 1. Ошибки Загрузки Данных
```typescript
// Проверка соединения с Supabase
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    console.log('Соединение успешно');
  } catch (error) {
    console.error('Ошибка соединения:', error);
  }
};
```

### 2. Проблемы с Анимациями
```typescript
// Отключение анимаций для отладки
const DEBUG_MODE = process.env.NODE_ENV === 'development';

const animationProps = DEBUG_MODE ? {} : {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 }
};
```

### 3. Ошибки Прав Доступа
```sql
-- Проверка RLS политик
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('job_applications', 'job_price_proposals', 'portfolio_items');
```

## Поддержка и Обновления

### Версионирование
```json
{
  "version": "1.0.0",
  "changelog": {
    "1.0.0": "Первый релиз с базовым функционалом",
    "1.1.0": "Добавлена поддержка альбомов портфолио",
    "1.2.0": "Улучшены анимации и производительность"
  }
}
```

### Миграции
```typescript
// Обновление существующих компонентов
const migrationGuide = {
  "1.0.0-to-1.1.0": [
    "Добавить новые поля в интерфейс PortfolioItem",
    "Обновить запросы к базе данных",
    "Проверить совместимость анимаций"
  ]
};
```