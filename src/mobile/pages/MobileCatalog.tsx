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
import { supabase } from '@/integrations/supabase/client';

const categories = [
  { id: '1', name: 'Сантехника', icon: '🔧' },
  { id: '2', name: 'Электрика', icon: '⚡' },
  { id: '3', name: 'Уборка', icon: '🧹' },
  { id: '4', name: 'Ремонт', icon: '🔨' },
  { id: '5', name: 'Доставка', icon: '🚚' },
  { id: '6', name: 'Красота', icon: '💄' },
];

export default function MobileCatalog() {
  const [searchParams] = useSearchParams();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        ...(selectedCategory && { category_id: selectedCategory }),
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`https://adstlhdgegtkvtgklkyx.supabase.co/functions/v1/jobs-catalog?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkc3RsaGRnZWd0a3Z0Z2tsa3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTMxMzMsImV4cCI6MjA3MDUyOTEzM30.SzYVLiUQPa9ZM1bVlX5UupyPte_BxELij8BpUV0xhrs',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error fetching jobs:', data);
        return;
      }

      if (data?.jobs) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery !== searchParams.get('q')) {
        fetchJobs();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const handleCategorySelect = (categoryId: string) => {
    const newCategory = categoryId === selectedCategory ? '' : categoryId;
    setSelectedCategory(newCategory);
  };

  const handleJobPress = (jobId: string) => {
    // Navigate to job detail
    window.location.href = `/job/${jobId}`;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
      <MobileHeader 
        title="Поиск услуг"
        showBack 
        showSearch
      />

      <div 
        className="px-4 pt-4"
        style={{ 
          paddingTop: 80 + safeAreaInsets.top + 16,
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
              onChange={handleSearchChange}
              className="pl-12 h-12 text-base rounded-xl bg-white border-gray-200 shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="h-12 px-4 rounded-xl bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-700 hover:bg-[#E5E7EB]"
          >
            <SlidersHorizontal size={18} />
          </Button>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center text-gray-600 mb-6"
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
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Категории</h3>
          <div className="grid grid-cols-2 gap-3">{/* организовал в сетку 2 колонки с равномерными отступами */}
            {categories.map((category) => (
              <Button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full rounded-xl text-sm px-3 py-3 h-12 flex items-center justify-start ${
                  selectedCategory === category.id 
                    ? 'bg-[#E5E7EB] shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-800' 
                    : 'bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] text-gray-700 hover:bg-[#E5E7EB]'
                }`}
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
          <h3 className="text-lg font-semibold text-gray-800">
            {loading ? 'Загрузка...' : `Найдено ${jobs.length} заказов`}
          </h3>
          <Button className="text-sm bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-700 hover:bg-[#E5E7EB] rounded-xl px-3 py-2">
            <Filter size={16} className="mr-2" />
            Сортировка
          </Button>
        </motion.div>

        {/* Jobs List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Загрузка заказов...</div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Заказы не найдены</div>
            </div>
          ) : (
            jobs.map((job, index) => (
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
            ))
          )}
        </div>

        {/* Load More */}
        {!loading && jobs.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <Button 
              onClick={fetchJobs}
              className="w-full h-12 rounded-xl bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-700 hover:bg-[#E5E7EB]"
            >
              Обновить
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}