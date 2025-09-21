import React, { useEffect, useState } from 'react';
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
    <div className="min-h-screen bg-background">
      <MobileHeader 
        showNotifications 
        showSearch 
        transparent 
      />

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative pt-20 pb-8"
        style={{ paddingTop: 56 + safeAreaInsets.top }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="relative px-4">
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-3xl font-bold mb-2 leading-tight"
          >
            Найдите идеального
            <span className="text-primary block">специалиста</span>
          </motion.h1>
          
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-muted-foreground mb-6 text-lg"
          >
            Тысячи проверенных мастеров готовы помочь
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex space-x-2 mb-6"
          >
            <div className="flex-1 relative">
              <Input
                placeholder="Что вам нужно сделать?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-12 text-base rounded-2xl bg-card border-0 shadow-lg"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            </div>
            <Button
              onClick={handleSearch}
              className="h-12 px-6 rounded-2xl shadow-lg"
            >
              <Search size={20} />
            </Button>
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex items-center text-muted-foreground mb-8"
          >
            <MapPin size={16} className="mr-2" />
            <span>Кишинёв, Молдова</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Categories */}
      <div className="px-4 mb-8">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-xl font-semibold mb-4"
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
                className={cn(
                  "p-4 bg-gradient-to-br",
                  category.color,
                  "text-white border-0"
                )}
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <h3 className="font-medium text-sm">{category.name}</h3>
              </MobileCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="px-4 mb-8">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-xl font-semibold mb-4"
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
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <feature.icon className="text-primary" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </MobileCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-4 mb-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <MobileCard gradient className="text-center">
            <TrendingUp className="mx-auto mb-4 text-primary" size={32} />
            <h3 className="text-lg font-semibold mb-2">Станьте специалистом</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Присоединяйтесь к тысячам мастеров и начните зарабатывать уже сегодня
            </p>
            <Button asChild className="w-full h-12 rounded-2xl">
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