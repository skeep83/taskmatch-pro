import React, { useEffect, useMemo, useState } from 'react';
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
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useEnhancedI18n } from "@/i18n/enhanced";

type Category = {
  id: string;
  key: string;
  name: string;
  icon: string;
  popularity: number;
};

const ACTIVE_JOB_STATUSES = ['new'] as const;

export default function MobileCatalog() {
  const { t } = useEnhancedI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category_id') || searchParams.get('category') || '');
  const [jobs, setJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: categoriesData, error: categoriesError }, { data: jobsForCounts, error: jobsError }] = await Promise.all([
        supabase.from('categories').select('id,label_ru,key').order('label_ru'),
        supabase.from('jobs').select('category_id,status').in('status', ACTIVE_JOB_STATUSES).limit(1000),
      ]);

      if (categoriesError) {
        console.error('Failed to load categories:', categoriesError);
        return;
      }
      if (jobsError) {
        console.error('Failed to load category popularity:', jobsError);
      }

      const counts = new Map<string, number>();
      (jobsForCounts || []).forEach((job: any) => {
        if (!job.category_id) return;
        counts.set(job.category_id, (counts.get(job.category_id) || 0) + 1);
      });

      const nextCategories = (categoriesData || []).map((category: any) => ({
        id: category.id,
        key: category.key,
        name: category.label_ru || category.key,
        icon: getCategoryIcon(category.label_ru, category.key),
        popularity: counts.get(category.id) || 0,
      })).sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return a.name.localeCompare(b.name, 'ru');
      });

      setCategories(nextCategories);
    })();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id ?? null;

      let query = supabase
        .from('jobs')
        .select('id,public_id,title,description,created_at,location_address,urgency,status,budget_min_cents,budget_max_cents,category_id,categories(label_ru,key),client_id')
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(20);

      if (uid) {
        query = query.neq('client_id', uid);
      }

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]);
        return;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      const filtered = (data || []).filter((job: any) => {
        if (!normalizedQuery) return true;
        const haystack = [
          job.title || '',
          job.description || '',
          job.location_address || '',
          job.categories?.label_ru || '',
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      });

      setJobs(filtered.map((job: any) => ({
        id: job.id,
        public_id: job.public_id,
        title: job.title,
        description: job.description,
        budget_min: job.budget_min_cents ? Math.round(job.budget_min_cents / 100) : undefined,
        budget_max: job.budget_max_cents ? Math.round(job.budget_max_cents / 100) : undefined,
        location: job.location_address,
        created_at: job.created_at,
        category_name: job.categories?.label_ru || job.categories?.key,
        urgency: job.urgency === 'urgent' ? 'high' : job.urgency === 'same_day' ? 'medium' : 'low',
        status: job.status,
        job_photos: [],
      })));
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextSearchQuery = searchParams.get('q') || '';
    const rawCategory = searchParams.get('category_id') || searchParams.get('category') || '';
    // Accept both category id (uuid) and category key (e.g. "plumbing")
    const byKey = categories.find((c) => c.key === rawCategory);
    const nextSelectedCategory = byKey ? byKey.id : rawCategory;
    if (nextSearchQuery !== searchQuery) setSearchQuery(nextSearchQuery);
    if (nextSelectedCategory !== selectedCategory) setSelectedCategory(nextSelectedCategory);
  }, [searchParams, categories]);

  useEffect(() => {
    fetchJobs();
  }, [selectedCategory, searchQuery]);

  const topCategories = useMemo(() => categories.slice(0, 12), [categories]);
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategory) || null,
    [categories, selectedCategory]
  );
  const trimmedSearchQuery = searchQuery.trim();

  const handleCategorySelect = (categoryId: string) => {
    const newCategory = categoryId === selectedCategory ? '' : categoryId;
    setSelectedCategory(newCategory);
    setSearchQuery('');

    const next = new URLSearchParams(searchParams);
    next.delete('q');
    if (newCategory) {
      next.set('category_id', newCategory);
      next.delete('category');
    } else {
      next.delete('category_id');
      next.delete('category');
    }
    setSearchParams(next, { replace: true });
  };

  const handleJobPress = (jobId: string) => {
    window.location.href = `/job/${jobId}`;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-neo">
      <MobileHeader
        title={t("ui.katalog_zakazov")}
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
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex space-x-2 mb-4"
        >
          <div className="flex-1 relative">
            <Input
              placeholder={t("ui.chto_vam_nuzhno")}
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-12 h-12 text-base rounded-xl bg-white border-gray-200 neo-inset-4"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="h-12 px-4 rounded-xl bg-neo neo-6 active:neo-inset-3 text-gray-700 hover:bg-neo"
          >
            <SlidersHorizontal size={18} />
          </Button>
        </motion.div>

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center text-gray-600 mb-3"
        >
          <MapPin size={16} className="mr-2" />
          <span>{t("ui.kishinev_moldova")}</span>
        </motion.div>

        {(trimmedSearchQuery || activeCategory) && (
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="mb-5"
          >
            <MobileCard className="p-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {trimmedSearchQuery && (
                  <div className="rounded-full px-3 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-200">
                    Поиск: {trimmedSearchQuery}
                  </div>
                )}
                {activeCategory && (
                  <div className="rounded-full px-3 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-200">
                    {activeCategory.icon} Категория: {activeCategory.name}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {activeCategory
                  ? `Показаны заявки по категории ${activeCategory.name}${trimmedSearchQuery ? ' с учетом текстового поиска.' : '.'}`
                  : t("ui.pokazany_zaiavki_po_vsem")}
              </div>
            </MobileCard>
          </motion.div>
        )}

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold mb-3 text-gray-800">{t("section.categories")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {topCategories.map((category) => (
              <Button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full rounded-xl text-sm px-3 py-3 h-12 flex items-center justify-start ${
                  selectedCategory === category.id
                    ? 'bg-neo neo-inset-3 text-gray-800'
                    : 'bg-neo neo-6 text-gray-700 hover:bg-neo'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                <span className="truncate">{category.name}</span>
                <span className="ml-auto text-xs opacity-70">{category.popularity}</span>
              </Button>
            ))}
          </div>
        </motion.div>

        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6"
          >
            <MobileCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium">{t("ui.filtry")}</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory('');
                    setSearchQuery('');
                    setSearchParams(new URLSearchParams(), { replace: true });
                  }}
                >
                  {t("ui.sbrosit")}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground mt-3">
                {t("ui.kategorii_otsortirovany_po_realnoi")}
              </div>
            </MobileCard>
          </motion.div>
        )}

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-2"
        >
          <h3 className="text-lg font-semibold text-gray-800">
            {loading ? t("common.loading") : `Найдено ${jobs.length} заказов`}
          </h3>
          <Button className="text-sm bg-neo neo-6 active:neo-inset-3 text-gray-700 hover:bg-neo rounded-xl px-3 py-2">
            <Filter size={16} className="mr-2" />
            {t("ui.aktualnye")}
          </Button>
        </motion.div>

        {activeCategory && (
          <div className="text-sm text-gray-500 mb-4">
            Сейчас выбрана категория: <span className="font-medium text-gray-700">{activeCategory.name}</span>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">{t("biz.jobs.loading")}</div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-gray-500">{t("ui.zakazy_ne_naideny")}</div>
              {selectedCategory && (
                <div className="text-xs text-gray-400">
                  Попробуйте сбросить текстовый поиск или выбрать другую категорию.
                </div>
              )}
            </div>
          ) : (
            jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <MobileJobCard
                  job={job}
                  onPress={() => handleJobPress(job.id)}
                />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
