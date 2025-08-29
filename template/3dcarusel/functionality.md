# Функционал 3D Карусели Откликов

## Основные Функции

### 1. Отображение Откликов
- **Источники данных**: Объединение откликов из `job_applications` и `job_price_proposals`
- **Real-time обновления**: Автоматическое получение новых откликов через Supabase subscriptions
- **Дополнительные данные**: Профили специалистов, рейтинги, портфолио

### 2. Навигация по Карточкам
```typescript
// Переключение карточек
const nextCard = () => setCurrentIndex((prev) => (prev + 1) % applications.length);
const prevCard = () => setCurrentIndex((prev) => (prev - 1 + applications.length) % applications.length);

// Прямой переход к карточке
const goToCard = (index: number) => setCurrentIndex(index);
```

### 3. Выбор Специалиста
```typescript
const handleSelectProfessional = async (proId: string) => {
  try {
    setSelecting(proId);
    
    const { error } = await supabase
      .from('jobs')
      .update({ pro_id: proId, status: 'accepted' })
      .eq('id', jobId);

    if (error) throw error;

    toast({
      title: 'Специалист выбран',
      description: 'Специалист был успешно назначен на заказ'
    });
    
    onApplicationSelect();
  } catch (error: any) {
    // Обработка ошибок
  } finally {
    setSelecting(null);
  }
};
```

## Система Портфолио

### 1. Открытие Портфолио
```typescript
const handlePortfolioOpen = (application: JobApplication) => {
  // Сбор всех изображений из портфолио
  const images: any[] = [];
  
  application.portfolio?.forEach(item => {
    // Основное изображение
    if (item.image_url) {
      images.push({
        id: `main-${item.id}`,
        url: item.image_url,
        title: item.title || 'Основное фото',
        description: `Работа: ${item.title || 'Без названия'}`,
        isMain: true
      });
    }
    
    // Дополнительные изображения
    if (item.portfolio_media) {
      item.portfolio_media
        .filter(media => media.file_type === 'image' || media.file_type.startsWith('image/'))
        .sort((a, b) => a.display_order - b.display_order)
        .forEach(media => {
          images.push({
            id: media.id,
            url: media.file_url,
            title: media.file_name || 'Дополнительное фото',
            description: `Работа: ${item.title || 'Без названия'}`,
            isMain: false
          });
        });
    }
  });
  
  setAllPortfolioImages(images);
  setCurrentImageIndex(0);
  setSelectedPortfolio(application);
  setPortfolioModalOpen(true);
};
```

### 2. Навигация в Альбоме
```typescript
// Переключение изображений
const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allPortfolioImages.length);
const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allPortfolioImages.length) % allPortfolioImages.length);

// Переход к конкретному изображению
const goToImage = (index: number) => setCurrentImageIndex(index);
```

## Состояния Компонента

### 1. Загрузка
```typescript
const [loading, setLoading] = useState(true);

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
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Пока нет откликов</h3>
        <p className="text-muted-foreground">
          Специалисты скоро увидят ваш заказ и начнут откликаться
        </p>
      </CardContent>
    </Card>
  );
}
```

### 3. Специалист Назначен
```typescript
if (selectedProId) {
  return (
    <div className="space-y-6">
      {/* Статус выполнения */}
      <JobStatusProgress 
        status={jobStatus as any}
        startConfirmed={false}
        endConfirmed={false}
      />
      {/* Советы по работе */}
    </div>
  );
}
```

## Real-time Обновления

### Подписка на Изменения
```typescript
useEffect(() => {
  if (!jobId) return;

  const channel = supabase
    .channel(`job-applications-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'job_applications',
        filter: `job_id=eq.${jobId}`
      },
      (payload) => {
        console.log('New job application received:', payload);
        fetchApplications(); // Обновление списка
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'job_price_proposals',
        filter: `job_id=eq.${jobId}`
      },
      (payload) => {
        console.log('New price proposal received:', payload);
        fetchApplications(); // Обновление списка
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [jobId]);
```

## Обработка Данных

### Получение Откликов
```typescript
const fetchApplications = async () => {
  try {
    setLoading(true);
    
    // Получение откликов и предложений цен
    const [applicationsResponse, proposalsResponse] = await Promise.all([
      supabase.from('job_applications').select(`
        *,
        profiles:pro_id (
          first_name, last_name, full_name, avatar_url
        )
      `).eq('job_id', jobId),
      
      supabase.from('job_price_proposals').select(`
        id, job_id, pro_id, price_cents, warranty_days,
        eta_slot, note, status, created_at, updated_at
      `).eq('job_id', jobId)
    ]);

    // Объединение данных
    const allApplications = [
      ...(applicationsResponse.data || []),
      ...(proposalsResponse.data || [])
    ];

    // Обогащение данными специалистов
    const enhancedApplications = await Promise.all(
      allApplications.map(async (app) => {
        // Профиль, рейтинги, портфолио
        const [profileData, proProfile, ratings, portfolioData] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', app.pro_id).maybeSingle(),
          supabase.from('pro_profiles').select('*').eq('user_id', app.pro_id).maybeSingle(),
          supabase.from('ratings').select('score').eq('to_user_id', app.pro_id),
          supabase.from('portfolio_items').select(`
            id, title, image_url,
            portfolio_media (id, file_url, file_type, display_order, file_name)
          `).eq('pro_id', app.pro_id)
        ]);

        return {
          ...app,
          profiles: profileData?.data,
          proProfile: proProfile?.data,
          rating: ratings?.data?.length > 0 ? {
            avg_score: ratings.data.reduce((sum, r) => sum + r.score, 0) / ratings.data.length,
            rating_count: ratings.data.length
          } : null,
          portfolio: portfolioData?.data || []
        };
      })
    );

    setApplications(enhancedApplications);
  } catch (error) {
    console.error('Error in fetchApplications:', error);
  } finally {
    setLoading(false);
  }
};
```

## Интерфейс Пропсов

```typescript
interface JobApplicationsListProps {
  jobId: string;                    // ID заказа
  jobStatus: string;                // Статус заказа
  selectedProId?: string;           // ID выбранного специалиста
  onApplicationSelect: () => void;  // Колбек при выборе специалиста
}
```

## Управление Состоянием

```typescript
const [applications, setApplications] = useState<JobApplication[]>([]);
const [loading, setLoading] = useState(true);
const [selecting, setSelecting] = useState<string | null>(null);
const [currentIndex, setCurrentIndex] = useState(0);
const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
const [selectedPortfolio, setSelectedPortfolio] = useState<JobApplication | null>(null);
const [currentImageIndex, setCurrentImageIndex] = useState(0);
const [allPortfolioImages, setAllPortfolioImages] = useState<any[]>([]);
```