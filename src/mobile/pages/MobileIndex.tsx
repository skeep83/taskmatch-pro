import { default as React, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Zap, Shield, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { useMobile } from '../providers/MobileProvider';
import { supabase } from '@/integrations/supabase/client';
import { categoryLabel } from '@/lib/categoryLabel';
import { getCategoryIcon } from '@/utils/categoryIcons';
import heroImage from '@/assets/services-hero.jpg';
import { useEnhancedI18n } from "@/i18n/enhanced";

type HomeCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

const ACTIVE_JOB_STATUSES = ['new', 'accepted', 'in_progress', 'done'] as const;



function MobileIndex() {
  const { t, language } = useEnhancedI18n();
  const features = [
    { icon: Zap, title: t("ui.predlozheniia"), description: t("ui.poluchaite_predlozheniia_po_zadache") },
    { icon: Shield, title: t("ui.bezopasno"), description: t("ui.profili_ispolnitelei_i_poniatnye") },
    { icon: Star, title: t("ui.prozrachno"), description: t("ui.sravnivaite_reiting_otzyvy_i") },
  ];
  const navigate = useNavigate();
  const { safeAreaInsets, bottomNavHeight } = useMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<HomeCategory[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: categoriesData, error: categoriesError }, { data: jobsData, error: jobsError }] = await Promise.all([
        supabase.from('categories').select('id,label_ru,label_ro,key').order('label_ru'),
        supabase.from('jobs').select('category_id,status').in('status', ACTIVE_JOB_STATUSES).limit(1000),
      ]);

      if (categoriesError) {
        console.error('Failed to load home categories:', categoriesError);
        return;
      }
      if (jobsError) {
        console.error('Failed to load home category popularity:', jobsError);
      }

      const counts = new Map<string, number>();
      (jobsData || []).forEach((job: any) => {
        if (!job.category_id) return;
        counts.set(job.category_id, (counts.get(job.category_id) || 0) + 1);
      });

      const next = (categoriesData || [])
        .map((category: any) => ({
          id: category.id,
          name: categoryLabel(category, language) || category.key,
          icon: getCategoryIcon(category.label_ru, category.key),
          color: 'from-slate-500 to-slate-600',
          popularity: counts.get(category.id) || 0,
        }))
        .sort((a, b) => {
          if (b.popularity !== a.popularity) return b.popularity - a.popularity;
          return a.name.localeCompare(b.name, 'ru');
        })
        .slice(0, 6)
        .map(({ popularity, ...category }) => category);

      setCategories(next);
    })();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/catalog');
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    navigate(`/catalog?category_id=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-neo">
      <MobileHeader
        showNotifications
        showSearch
        showLogout
      />

      {/* Hero section с neumorphic дизайном */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="px-4 pt-20"
        style={{ paddingTop: 72 + safeAreaInsets.top }}
      >
        <MobileCard className="p-6 mb-6">
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-2xl font-bold mb-2 leading-tight text-gray-800"
          >
            {t("ui.naidite")}
            <span className="text-primary block">{t("ui.ispolnitelia")}</span>
          </motion.h1>

          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-gray-600 mb-6"
          >
            {t("ui.sozdaite_zakaz_i_poluchite")}
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex space-x-2 mb-4"
          >
            <div className="flex-1 relative">
              <Input
                placeholder={t("ui.chto_vam_nuzhno_sdelat")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-12 text-base rounded-xl bg-white border-gray-200 neo-inset-4"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            </div>
            <Button
              onClick={handleSearch}
              className="h-12 px-6 rounded-xl bg-neo neo-6 active:neo-inset-3 text-gray-700 hover:bg-neo"
            >
              <Search size={18} />
            </Button>
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex items-center text-gray-600"
          >
            <MapPin size={16} className="mr-2" />
            <span>{t("ui.kishinev_moldova")}</span>
          </motion.div>
        </MobileCard>
      </motion.div>

      {/* Features с neumorphic дизайном */}
      <div className="px-4 mb-6">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-lg font-semibold mb-4 text-gray-800"
        >
          {t("ui.pochemu_vybiraiut_nas")}
        </motion.h2>

        <div className="space-y-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.9 + index * 0.1, duration: 0.6 }}
            >
              <MobileCard className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-neo neo-inset-3 rounded-xl">
                    <feature.icon className="text-primary" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium mb-1 text-gray-800">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </MobileCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Categories с neumorphic дизайном */}
      <div className="px-4 mb-6">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-lg font-semibold mb-4 text-gray-800"
        >
          {t("section.categories")}
        </motion.h2>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
            >
              <MobileCard
                pressable
                onPress={() => handleCategoryPress(category.id)}
                className="p-4 h-20 flex flex-col justify-center items-center text-center"
              >
                <div className="text-2xl mb-1">{category.icon}</div>
                <h3 className="font-medium text-sm text-gray-700">{category.name}</h3>
              </MobileCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section - объединенный */}
      <div className="px-4 mb-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <MobileCard className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">{t("ui.prisoediniaites_k_platforme")}</h3>
            <p className="text-gray-600 mb-4 text-sm">
              {t("ui.vyberite_svoiu_rol_i")}
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full h-12 rounded-xl bg-neo neo-6 active:neo-inset-3 text-gray-700 hover:bg-neo">
                <Link to="/auth?type=register&role=pro">
                  {t("landing.aud2_cta")}
                </Link>
              </Button>
              <Button asChild className="w-full h-12 rounded-xl bg-neo neo-6 active:neo-inset-3 text-gray-700 hover:bg-neo">
                <Link to="/tenders">
                  {t("ui.dlia_biznesa")}
                </Link>
              </Button>
            </div>
          </MobileCard>
        </motion.div>
      </div>

      {/* Bottom spacing for navigation */}
      <div style={{ height: bottomNavHeight + safeAreaInsets.bottom }} />
    </div>
  );
}

export default MobileIndex;