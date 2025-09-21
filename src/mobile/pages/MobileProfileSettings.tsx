import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Camera, MapPin, Phone, Mail, Globe, 
  Briefcase, Clock, DollarSign, Save, CheckCircle2,
  ArrowLeft, Wrench, Plus, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { useMobile } from '../providers/MobileProvider';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { AvatarUpload } from '@/components/AvatarUpload';
import { NeumorphicIcon } from '@/components/ui/neumorphic-icon';

interface Profile {
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  city: string;
  country: string;
  locale: string;
  avatar_url: string;
}

interface ProProfile {
  bio: string;
  radius_km: number;
  hourly_rate_cents: string;
  fixed_price_cents: string;
}

export default function MobileProfileSettings() {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const { bottomNavHeight, safeAreaInsets } = useMobile();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('client');
  const [activeTab, setActiveTab] = useState('basic');

  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    full_name: '',
    phone: '',
    city: '',
    country: 'RO',
    locale: 'ru',
    avatar_url: ''
  });

  const [proProfile, setProProfile] = useState<ProProfile>({
    bio: '',
    radius_km: 10,
    hourly_rate_cents: '',
    fixed_price_cents: ''
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          city: profileData.city || '',
          country: profileData.country || 'RO',
          locale: profileData.locale || 'ru',
          avatar_url: profileData.avatar_url || ''
        });
      }

      // Check user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const currentRole = roleData?.role || 'client';
      setUserRole(currentRole);

      // Load categories
      const { data: catsData } = await supabase
        .from('service_categories')
        .select('id, name, name_ro')
        .eq('is_active', true)
        .order('name');

      setCategories(catsData || []);

      // If user is pro, load pro profile and categories
      if (currentRole === 'pro') {
        const { data: proData } = await supabase
          .from('pro_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (proData) {
          setProProfile({
            bio: proData.bio || '',
            radius_km: proData.radius_km || 10,
            hourly_rate_cents: proData.hourly_rate_cents?.toString() || '',
            fixed_price_cents: proData.fixed_price_cents?.toString() || ''
          });
        }

        // Load selected categories
        const { data: catData } = await supabase
          .from('pro_categories')
          .select('category_id')
          .eq('user_id', user.id);

        setSelectedCategories((catData || []).map(c => c.category_id));
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные профиля",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update full_name based on first_name and last_name
      const fullName = `${profile.first_name?.trim() || ''} ${profile.last_name?.trim() || ''}`.trim();
      
      // Update basic profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: profile.first_name?.trim() || null,
          last_name: profile.last_name?.trim() || null,
          full_name: fullName || null,
          phone: profile.phone?.trim() || null,
          city: profile.city?.trim() || null,
          country: profile.country?.trim() || null,
          locale: profile.locale || 'ru',
          avatar_url: profile.avatar_url || null
        });

      if (profileError) throw profileError;

      // Update pro profile if user is a pro
      if (userRole === 'pro') {
        await saveProProfile();
      }

      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно сохранены"
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить профиль",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveProProfile = async () => {
    if (!user) return;

    // Upsert pro profile
    const payload: any = { 
      user_id: user.id, 
      bio: proProfile.bio, 
      radius_km: proProfile.radius_km || 10 
    };
    
    if (proProfile.hourly_rate_cents !== '') {
      payload.hourly_rate_cents = Number(proProfile.hourly_rate_cents);
    }
    
    if (proProfile.fixed_price_cents !== '') {
      payload.fixed_price_cents = Number(proProfile.fixed_price_cents);
    }

    const { error: proError } = await supabase
      .from('pro_profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (proError) throw proError;

    // Sync categories
    const { data: existing } = await supabase
      .from('pro_categories')
      .select('category_id')
      .eq('user_id', user.id);

    const existingIds = new Set((existing || []).map(x => String(x.category_id)));
    const toAdd = selectedCategories
      .filter(id => !existingIds.has(id))
      .map(id => ({ user_id: user.id, category_id: id }));
    const toRemove = [...existingIds].filter((id: string) => !selectedCategories.includes(id));

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('pro_categories')
        .insert(toAdd);
      
      if (error) throw error;
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('pro_categories')
        .delete()
        .eq('user_id', user.id)
        .in('category_id', toRemove);
      
      if (error) throw error;
    }
  };

  const updateProfile = (field: keyof Profile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateProProfile = (field: keyof ProProfile, value: any) => {
    setProProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAvatarUpdate = (url: string | null) => {
    setProfile(prev => ({
      ...prev,
      avatar_url: url || ''
    }));
  };

  const tabItems = [
    { id: 'basic', label: 'Основное', icon: User },
    { id: 'contact', label: 'Контакты', icon: Phone },
    ...(userRole === 'pro' ? [
      { id: 'professional', label: 'Специалист', icon: Briefcase },
      { id: 'categories', label: 'Категории', icon: Wrench }
    ] : [])
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <MobileCard className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Загружаем профиль...</p>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB]">
      <MobileHeader 
        title="Настройки профиля"
        showBack={true}
      />
      
      <div 
        className="pt-20 pb-24 px-4 space-y-6"
        style={{ paddingTop: `${80 + safeAreaInsets.top}px` }}
      >
        {/* Tab Navigation */}
        <div className="overflow-x-auto">
          <div className="flex space-x-2 p-2 min-w-max">
            {tabItems.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-black'
                    : 'bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] text-gray-600'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Avatar */}
            <MobileCard className="text-center">
              <h3 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                <Camera className="h-5 w-5" />
                Фото профиля
              </h3>
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile.avatar_url}
                userName={`${profile.first_name} ${profile.last_name}`.trim()}
                onAvatarUpdate={handleAvatarUpdate}
              />
            </MobileCard>

            {/* Basic Info */}
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Личная информация
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firstName">Имя</Label>
                  <Input
                    id="firstName"
                    value={profile.first_name}
                    onChange={(e) => updateProfile('first_name', e.target.value)}
                    placeholder="Введите имя"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input
                    id="lastName"
                    value={profile.last_name}
                    onChange={(e) => updateProfile('last_name', e.target.value)}
                    placeholder="Введите фамилию"
                    className="mt-1"
                  />
                </div>
              </div>
            </MobileCard>

            {/* Location */}
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Местоположение
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="city">Город</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => updateProfile('city', e.target.value)}
                    placeholder="Введите город"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Страна</Label>
                  <Input
                    id="country"
                    value={profile.country}
                    onChange={(e) => updateProfile('country', e.target.value)}
                    placeholder="Введите страну"
                    className="mt-1"
                  />
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Контактные данные
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    placeholder="Введите номер телефона"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="locale">Язык интерфейса</Label>
                  <select
                    id="locale"
                    value={profile.locale}
                    onChange={(e) => updateProfile('locale', e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  >
                    <option value="ru">Русский</option>
                    <option value="ro">Română</option>
                  </select>
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {activeTab === 'professional' && userRole === 'pro' && (
          <div className="space-y-6">
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Профессиональная информация
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio">О себе</Label>
                  <Textarea
                    id="bio"
                    value={proProfile.bio}
                    onChange={(e) => updateProProfile('bio', e.target.value)}
                    placeholder="Расскажите о своем опыте и навыках"
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="radius">Радиус работы (км)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={proProfile.radius_km}
                    onChange={(e) => updateProProfile('radius_km', Number(e.target.value))}
                    placeholder="10"
                    className="mt-1"
                  />
                </div>
              </div>
            </MobileCard>

            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Стоимость услуг
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hourlyRate">Почасовая ставка (копейки)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={proProfile.hourly_rate_cents}
                    onChange={(e) => updateProProfile('hourly_rate_cents', e.target.value)}
                    placeholder="5000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fixedPrice">Фиксированная цена (копейки)</Label>
                  <Input
                    id="fixedPrice"
                    type="number"
                    value={proProfile.fixed_price_cents}
                    onChange={(e) => updateProProfile('fixed_price_cents', e.target.value)}
                    placeholder="25000"
                    className="mt-1"
                  />
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {activeTab === 'categories' && userRole === 'pro' && (
          <div className="space-y-6">
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Категории услуг
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Выберите категории услуг, которые вы предоставляете
              </p>
              
              <div className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCategories.includes(category.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {profile.locale === 'ro' ? category.name_ro : category.name}
                      </span>
                      {selectedCategories.includes(category.id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedCategories.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Выбранные категории:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((catId) => {
                      const category = categories.find(c => c.id === catId);
                      return category ? (
                        <Badge
                          key={catId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {profile.locale === 'ro' ? category.name_ro : category.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(catId);
                            }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </MobileCard>
          </div>
        )}

        {/* Save Button */}
        <MobileCard>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] text-gray-700"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                Сохраняем...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Сохранить изменения
              </div>
            )}
          </Button>
        </MobileCard>
      </div>
    </div>
  );
}