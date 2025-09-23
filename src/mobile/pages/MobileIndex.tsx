import { default as React, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Zap, Shield, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { useMobile } from '../providers/MobileProvider';
import heroImage from '@/assets/services-hero.jpg';

const categories = [
  { id: '1', name: 'Сантехника', icon: '🔧', color: 'from-blue-500 to-blue-600' },
  { id: '2', name: 'Электрика', icon: '⚡', color: 'from-yellow-500 to-yellow-600' },
  { id: '3', name: 'Уборка', icon: '🧹', color: 'from-green-500 to-green-600' },
  { id: '4', name: 'Ремонт', icon: '🔨', color: 'from-orange-500 to-orange-600' },
  { id: '5', name: 'Доставка', icon: '🚚', color: 'from-purple-500 to-purple-600' },
  { id: '6', name: 'Красота', icon: '💄', color: 'from-pink-500 to-pink-600' },
];

const features = [
  { icon: Zap, title: 'Быстро', description: 'Специалисты откликаются за минуты' },
  { icon: Shield, title: 'Безопасно', description: 'Проверенные мастера с гарантией' },
  { icon: Star, title: 'Качественно', description: 'Высокие рейтинги и отзывы клиентов' },
];

function MobileIndex() {
  const navigate = useNavigate();
  const { safeAreaInsets, bottomNavHeight } = useMobile();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/catalog');
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    navigate(`/catalog?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
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
            Найдите идеального
            <span className="text-primary block">специалиста</span>
          </motion.h1>
          
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-gray-600 mb-6"
          >
            Тысячи проверенных мастеров готовы помочь
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
                placeholder="Что вам нужно сделать?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-12 text-base rounded-xl bg-white border-gray-200 shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB]"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            </div>
            <Button
              onClick={handleSearch}
              className="h-12 px-6 rounded-xl bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-700 hover:bg-[#E5E7EB]"
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
            <span>Кишинёв, Молдова</span>
          </motion.div>
        </MobileCard>
      </motion.div>

      {/* Categories с neumorphic дизайном */}
      <div className="px-4 mb-6">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-lg font-semibold mb-4 text-gray-800"
        >
          Популярные категории
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

      {/* Features с neumorphic дизайном */}
      <div className="px-4 mb-6">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-lg font-semibold mb-4 text-gray-800"
        >
          Почему выбирают нас
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
                  <div className="p-2 bg-[#E5E7EB] shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl">
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

      {/* CTA Section с neumorphic дизайном */}
      <div className="px-4 mb-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <MobileCard className="p-6 text-center">
            <div className="p-3 bg-[#E5E7EB] shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] rounded-xl w-fit mx-auto mb-4">
              <TrendingUp className="text-primary" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Станьте специалистом</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Присоединяйтесь к тысячам мастеров и начните зарабатывать уже сегодня
            </p>
            <Button asChild className="w-full h-12 rounded-xl bg-[#E5E7EB] shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] active:shadow-[inset_3px_3px_6px_#D1D5DB,inset_-3px_-3px_6px_#F9FAFB] text-gray-700 hover:bg-[#E5E7EB]">
              <Link to="/auth?type=register&role=pro">
                Начать зарабатывать
              </Link>
            </Button>
          </MobileCard>
        </motion.div>
      </div>

      {/* Bottom spacing for navigation */}
      <div style={{ height: bottomNavHeight + safeAreaInsets.bottom }} />
    </div>
  );
}

export default MobileIndex;