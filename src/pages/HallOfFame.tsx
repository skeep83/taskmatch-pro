import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileTabNavigation } from '@/components/servicehub/MobileTabNavigation';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { 
  Star, 
  Trophy, 
  Award, 
  Search, 
  Filter, 
  MapPin, 
  Shield, 
  CheckCircle,
  Eye,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Provider {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  category: string;
  location: string;
  verificationLevel: 'basic' | 'verified' | 'premium';
  badges: string[];
  portfolioSamples: Array<{
    id: string;
    beforeImage: string;
    afterImage?: string;
    title: string;
    description: string;
  }>;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  responseTime: number; // в минутах
  guaranteeOffered: boolean;
  isOnline: boolean;
}

export const HallOfFame: React.FC = () => {
  const { isMobile } = useDeviceDetection();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    { value: 'all', label: 'Все категории' },
    { value: 'plumbing', label: 'Сантехника' },
    { value: 'electric', label: 'Электрика' },
    { value: 'cleaning', label: 'Уборка' },
    { value: 'appliance', label: 'Бытовая техника' },
    { value: 'painting', label: 'Покраска' },
    { value: 'moving', label: 'Переезды' },
  ];

  const sortOptions = [
    { value: 'rating', label: 'По рейтингу' },
    { value: 'reviews', label: 'По отзывам' },
    { value: 'price_low', label: 'Цена: низкая' },
    { value: 'price_high', label: 'Цена: высокая' },
    { value: 'response_time', label: 'Время отклика' },
  ];

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    // Обновляем URL параметры
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (sortBy !== 'rating') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, sortBy, setSearchParams]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      
      // Заглушка данных (в реальном проекте загружается из БД)
      const mockData: Provider[] = [
        {
          id: '1',
          name: 'Александр Петров',
          avatar: '/api/placeholder/100/100',
          rating: 4.9,
          reviewCount: 127,
          completedJobs: 156,
          category: 'plumbing',
          location: 'Кишинев',
          verificationLevel: 'premium',
          badges: ['100% срок', '5★ ×10 подряд', 'Эксперт года'],
          portfolioSamples: [
            {
              id: '1',
              beforeImage: '/api/placeholder/300/200',
              afterImage: '/api/placeholder/300/200',
              title: 'Замена сантехники в ванной',
              description: 'Полная замена труб и установка нового смесителя'
            },
            {
              id: '2',
              beforeImage: '/api/placeholder/300/200',
              title: 'Устранение протечки',
              description: 'Быстрое устранение аварийной протечки'
            }
          ],
          priceRange: { min: 200, max: 800, currency: 'MDL' },
          responseTime: 15,
          guaranteeOffered: true,
          isOnline: true
        },
        {
          id: '2',
          name: 'Мария Иванова',
          avatar: '/api/placeholder/100/100',
          rating: 4.8,
          reviewCount: 89,
          completedJobs: 95,
          category: 'cleaning',
          location: 'Бельцы',
          verificationLevel: 'verified',
          badges: ['Чистота+', 'Быстрый отклик'],
          portfolioSamples: [
            {
              id: '1',
              beforeImage: '/api/placeholder/300/200',
              afterImage: '/api/placeholder/300/200',
              title: 'Генеральная уборка офиса',
              description: 'Уборка офиса площадью 200 кв.м'
            }
          ],
          priceRange: { min: 150, max: 500, currency: 'MDL' },
          responseTime: 30,
          guaranteeOffered: true,
          isOnline: false
        }
      ];

      setProviders(mockData);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProviders = providers
    .filter(provider => {
      const matchesSearch = !searchQuery || 
        provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || provider.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'reviews':
          return b.reviewCount - a.reviewCount;
        case 'price_low':
          return a.priceRange.min - b.priceRange.min;
        case 'price_high':
          return b.priceRange.max - a.priceRange.max;
        case 'response_time':
          return a.responseTime - b.responseTime;
        default:
          return 0;
      }
    });

  const getVerificationIcon = (level: string) => {
    switch (level) {
      case 'premium':
        return <Trophy size={16} className="text-amber-500" />;
      case 'verified':
        return <Shield size={16} className="text-blue-500" />;
      default:
        return <CheckCircle size={16} className="text-gray-500" />;
    }
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    return `${days} дн`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка зала славы...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className={`container mx-auto p-4 ${isMobile ? 'pb-20' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full">
              <Trophy size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Зал славы
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Лучшие специалисты ServiceHub с проверенными отзывами
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Поиск специалистов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2">
              <Filter size={16} />
              Фильтры
            </Button>
          </div>
        </div>

        {/* Providers Grid */}
        <div className={cn(
          "grid gap-6 mb-8",
          viewMode === 'grid' 
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
            : "grid-cols-1"
        )}>
          {filteredAndSortedProviders.map(provider => (
            <div 
              key={provider.id}
              className="card-surface group cursor-pointer transition-all duration-300 hover:scale-105"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl"></div>
                    {provider.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {provider.name}
                      </h3>
                      {getVerificationIcon(provider.verificationLevel)}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <MapPin size={14} />
                      <span className="text-sm">{provider.location}</span>
                    </div>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart size={16} />
                </Button>
              </div>

              {/* Rating & Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-amber-500 fill-current" />
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {provider.rating}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({provider.reviewCount} отзывов)
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {provider.completedJobs} заказов
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Отвечает за {formatResponseTime(provider.responseTime)}
                  </div>
                </div>
              </div>

              {/* Badges */}
              {provider.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {provider.badges.slice(0, 3).map(badge => (
                    <Badge key={badge} variant="secondary" className="text-xs bg-primary/10 text-primary">
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Portfolio Samples */}
              {provider.portfolioSamples.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {provider.portfolioSamples.slice(0, 4).map(sample => (
                      <div key={sample.id} className="relative group/sample">
                        <img
                          src={sample.beforeImage}
                          alt={sample.title}
                          className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                        {sample.afterImage && (
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/sample:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-medium">До/После</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price & Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {provider.priceRange.min}-{provider.priceRange.max} {provider.priceRange.currency}
                  </div>
                  {provider.guaranteeOffered && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Shield size={12} />
                      <span>Гарантия</span>
                    </div>
                  )}
                </div>

                <Button size="sm" className="gap-1">
                  <Eye size={14} />
                  Профиль
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedProviders.length === 0 && (
          <div className="text-center py-12">
            <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Специалисты не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Попробуйте изменить фильтры поиска
            </p>
          </div>
        )}
      </div>

      {isMobile && <MobileTabNavigation />}
    </div>
  );
};

export default HallOfFame;