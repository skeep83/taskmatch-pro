# Система Портфолио и Альбомы

## Архитектура Альбома

### Структура Данных
```typescript
interface PortfolioImage {
  id: string;
  url: string;
  title: string;
  description: string;
  isMain: boolean;
}

interface PortfolioItem {
  id: string;
  title?: string;
  image_url: string;
  portfolio_media?: Array<{
    id: string;
    file_url: string;
    file_type: string;
    display_order: number;
    file_name?: string;
  }>;
}
```

## Функционал Альбома

### 1. Сбор Изображений
```typescript
const collectPortfolioImages = (portfolio: PortfolioItem[]): PortfolioImage[] => {
  const images: PortfolioImage[] = [];
  
  portfolio.forEach(item => {
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
  
  return images;
};
```

### 2. Управление Состоянием
```typescript
const [currentImageIndex, setCurrentImageIndex] = useState(0);
const [allPortfolioImages, setAllPortfolioImages] = useState<PortfolioImage[]>([]);
const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);

// Навигация
const nextImage = () => {
  setCurrentImageIndex((prev) => (prev + 1) % allPortfolioImages.length);
};

const prevImage = () => {
  setCurrentImageIndex((prev) => (prev - 1 + allPortfolioImages.length) % allPortfolioImages.length);
};

const goToImage = (index: number) => {
  setCurrentImageIndex(index);
};
```

## Компоненты Альбома

### 1. Основной Дисплей
```typescript
const MainImageDisplay = ({ image, onNext, onPrev, total, current }) => (
  <motion.div 
    key={current}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-muted shadow-2xl"
  >
    <OptimizedImage
      src={image.url}
      alt={image.title}
      width={800}
      height={500}
      className="w-full h-full object-cover"
    />
    
    {/* Информационный оверлей */}
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
      <div className="text-white">
        <h4 className="text-lg font-semibold mb-1">{image.title}</h4>
        <p className="text-sm opacity-90">{image.description}</p>
        {image.isMain && (
          <div className="inline-flex items-center gap-2 mt-2 bg-primary/20 text-primary-foreground px-3 py-1 rounded-lg text-sm">
            <Star className="w-4 h-4" />
            Главное фото
          </div>
        )}
      </div>
    </div>

    {/* Навигационные стрелки */}
    {total > 1 && (
      <>
        <NavigationButton direction="left" onClick={onPrev} />
        <NavigationButton direction="right" onClick={onNext} />
      </>
    )}

    {/* Счетчик изображений */}
    {total > 1 && (
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-medium">
        {current + 1} / {total}
      </div>
    )}

    {/* Кнопка полноэкранного режима */}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.open(image.url, '_blank')}
      className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-0"
    >
      <ExternalLink className="w-4 h-4" />
    </Button>
  </motion.div>
);
```

### 2. Миниатюры
```typescript
const ThumbnailNavigation = ({ images, currentIndex, onSelect }) => (
  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
    {images.map((image, index) => (
      <motion.button
        key={image.id}
        onClick={() => onSelect(index)}
        className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
          index === currentIndex 
            ? 'border-primary shadow-lg scale-105' 
            : 'border-transparent hover:border-muted-foreground/50'
        }`}
        whileHover={{ scale: index === currentIndex ? 1.05 : 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <OptimizedImage
          src={image.url}
          alt={image.title}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
        
        {/* Индикатор главного фото */}
        {image.isMain && (
          <div className="absolute top-1 left-1 w-2 h-2 bg-primary rounded-full" />
        )}
        
        {/* Оверлей активной миниатюры */}
        {index === currentIndex && (
          <div className="absolute inset-0 bg-primary/20" />
        )}
      </motion.button>
    ))}
  </div>
);
```

### 3. Навигационные Кнопки
```typescript
const NavigationButton = ({ direction, onClick, disabled = false }) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const position = direction === 'left' ? 'left-4' : 'right-4';
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`absolute ${position} top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 border-0 disabled:opacity-30`}
    >
      <Icon className="w-6 h-6" />
    </Button>
  );
};
```

## Модальное Окно

### Структура Dialog
```typescript
const PortfolioModal = ({ open, onOpenChange, portfolio, allImages, currentIndex }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={portfolio?.profiles?.avatar_url} />
            <AvatarFallback>
              {portfolio?.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'С'}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-xl">
              Портфолио {portfolio?.profiles?.full_name || 'специалиста'}
            </span>
            <p className="text-sm text-muted-foreground font-normal">
              {portfolio?.proProfile?.bio || 'Опытный специалист'}
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>
      
      <div className="mt-6">
        {allImages.length > 0 ? (
          <AlbumContent 
            images={allImages}
            currentIndex={currentIndex}
            onIndexChange={setCurrentImageIndex}
          />
        ) : (
          <EmptyPortfolio />
        )}
      </div>
      
      <PortfolioStats portfolio={portfolio} />
    </DialogContent>
  </Dialog>
);
```

## Статистика Портфолио

### Информационная Панель
```typescript
const PortfolioStats = ({ portfolio }) => (
  <div className="mt-6 pt-6 border-t border-gray-200">
    <div className="flex items-center justify-between text-sm text-gray-600">
      <div className="flex items-center gap-4">
        <span>Работ в портфолио: {portfolio?.portfolio?.length || 0}</span>
        {portfolio?.rating && (
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            {portfolio.rating.avg_score.toFixed(1)} ({portfolio.rating.rating_count} отзывов)
          </span>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(`/pro/${portfolio.pro_id}`, '_blank')}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Полный профиль
      </Button>
    </div>
  </div>
);
```

## Обработка Жестов

### Поддержка Свайпов
```typescript
const useSwipeNavigation = (onNext, onPrev) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) onNext();
    if (isRightSwipe) onPrev();
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};
```

### Клавиатурная Навигация
```typescript
const useKeyboardNavigation = (onNext, onPrev, onClose) => {
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onNext, onPrev, onClose]);
};
```

## Оптимизация Производительности

### Ленивая Загрузка
```typescript
const LazyImage = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} {...props}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
```

### Предзагрузка
```typescript
const preloadImages = (images) => {
  images.forEach(image => {
    const img = new Image();
    img.src = image.url;
  });
};

useEffect(() => {
  if (allPortfolioImages.length > 0) {
    preloadImages(allPortfolioImages);
  }
}, [allPortfolioImages]);
```

## Доступность

### ARIA Атрибуты
```typescript
<div
  role="img"
  aria-label={`Изображение ${currentIndex + 1} из ${total}: ${currentImage.title}`}
  aria-describedby="image-description"
>
  {/* Содержимое изображения */}
</div>

<div id="image-description" className="sr-only">
  {currentImage.description}
</div>
```

### Фокус-менеджмент
```typescript
const focusManagement = {
  onOpenModal: () => {
    const firstFocusable = modalRef.current?.querySelector('[tabindex], button, input');
    firstFocusable?.focus();
  },
  
  onCloseModal: () => {
    triggerRef.current?.focus();
  },
  
  trapFocus: (e) => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements?.[0];
    const lastElement = focusableElements?.[focusableElements.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  }
};
```