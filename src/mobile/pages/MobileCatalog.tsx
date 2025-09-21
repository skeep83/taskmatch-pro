import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileJobCard } from '../components/cards/MobileJobCard';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMobile } from '../providers/MobileProvider';

const categories = [
  { id: '1', name: 'Сантехника', icon: '🔧' },
  { id: '2', name: 'Электрика', icon: '⚡' },
  { id: '3', name: 'Уборка', icon: '🧹' },
  { id: '4', name: 'Ремонт', icon: '🔨' },
  { id: '5', name: 'Доставка', icon: '🚚' },
  { id: '6', name: 'Красота', icon: '💄' },
];

const mockJobs = [
  {
    id: '1',
    title: 'Ремонт крана в ванной',
    description: 'Течет кран в ванной комнате, нужна замена картриджа',
    budget_min: 200,
    budget_max: 500,
    location: 'Кишинев, Центр',
    created_at: new Date().toISOString(),
    category_name: 'Сантехника',
    client_name: 'Мария И.',
    client_rating: 4.8,
    urgency: 'high' as const,
    status: 'active'
  },
  {
    id: '2',
    title: 'Установка розетки',
    description: 'Нужно установить новую розетку в гостиной',
    budget_min: 150,
    budget_max: 300,
    location: 'Кишинев, Рышкановка',
    created_at: new Date().toISOString(),
    category_name: 'Электрика',
    client_name: 'Андрей П.',
    client_rating: 4.9,
    urgency: 'medium' as const,
    status: 'active'
  }
];

export default function MobileCatalog() {
  const [searchParams] = useSearchParams();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [jobs, setJobs] = useState(mockJobs);
  const [showFilters, setShowFilters] = useState(false);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
  };

  const handleJobPress = (jobId: string) => {
    // Navigate to job detail
    console.log('Navigate to job:', jobId);
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader 
        title="Поиск услуг"
        showBack 
      />

      <div 
        className="px-4 pt-4"
        style={{ 
          paddingTop: 56 + safeAreaInsets.top + 16,
          paddingBottom: bottomNavHeight + safeAreaInsets.bottom + 16 
        }}
      >
        {/* Search Bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex space-x-2 mb-4"
        >
          <div className="flex-1 relative">
            <Input
              placeholder="Что вам нужно?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base rounded-2xl bg-card border-0 shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-12 px-4 rounded-2xl"
          >
            <SlidersHorizontal size={20} />
          </Button>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center text-muted-foreground mb-6"
        >
          <MapPin size={16} className="mr-2" />
          <span>Кишинёв, Молдова</span>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold mb-3">Категории</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategorySelect(category.id)}
                className="rounded-full text-sm"
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Filters (if shown) */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6"
          >
            <MobileCard className="p-4">
              <h4 className="font-medium mb-3">Фильтры</h4>
              {/* Add filter controls here */}
              <div className="text-sm text-muted-foreground">
                Фильтры в разработке...
              </div>
            </MobileCard>
          </motion.div>
        )}

        {/* Results Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-4"
        >
          <h3 className="text-lg font-semibold">
            Найдено {jobs.length} заказов
          </h3>
          <Button variant="ghost" size="sm" className="text-sm">
            <Filter size={16} className="mr-2" />
            Сортировка
          </Button>
        </motion.div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <MobileJobCard
                job={job}
                onPress={() => handleJobPress(job.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <Button variant="outline" className="w-full h-12 rounded-2xl">
            Загрузить еще
          </Button>
        </motion.div>
      </div>
    </div>
  );
}