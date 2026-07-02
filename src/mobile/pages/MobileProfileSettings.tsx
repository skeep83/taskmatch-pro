import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User, Camera, MapPin, Phone, Mail, Globe,
  Briefcase, Clock, DollarSign, Save, CheckCircle2,
  ArrowLeft, Wrench, Plus, X, Settings, Bell, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MobileHeader } from '../components/navigation/MobileHeader';
import { MobileCard } from '../components/ui/MobileCard';
import { MobileCategorySelector } from '../components/ui/MobileCategorySelector';
import { useMobile } from '../providers/MobileProvider';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { AvatarUpload } from '@/components/AvatarUpload';
import { MobileAvatarUpload } from '../components/ui/MobileAvatarUpload';
import { NeumorphicIcon } from '@/components/ui/neumorphic-icon';
import { geocodeAddress, getCurrentResolvedLocation, type LocationPrecision, type LocationSource } from '@/lib/geolocation';

interface Profile {
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  city: string;
  country: string;
  locale: string;
  avatar_url: string;
  latitude?: number | null;
  longitude?: number | null;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  address_notes: string;
  location_public_label: string;
  location_precision: LocationPrecision | '';
  location_source: LocationSource | '';
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
    avatar_url: '',
    latitude: null,
    longitude: null,
    address_line1: '',
    address_line2: '',
    postal_code: '',
    address_notes: '',
    location_public_label: '',
    location_precision: '',
    location_source: ''
  });

  const [proProfile, setProProfile] = useState<ProProfile>({
    bio: '',
    radius_km: 10,
    hourly_rate_cents: '',
    fixed_price_cents: ''
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);

  const [notifications, setNotifications] = useState({
    newJobs: true,
    sms: false,
    email: true,
    push: true
  });

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
          avatar_url: profileData.avatar_url || '',
          latitude: profileData.latitude ?? null,
          longitude: profileData.longitude ?? null,
          address_line1: profileData.address_line1 || '',
          address_line2: profileData.address_line2 || '',
          postal_code: profileData.postal_code || '',
          address_notes: profileData.address_notes || '',
          location_public_label: profileData.location_public_label || '',
          location_precision: (profileData.location_precision || '') as LocationPrecision | '',
          location_source: (profileData.location_source || '') as LocationSource | ''
        });
      }

      // Check user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      let currentRole = roleData?.role || 'client';

      // Also check pro_profiles table for pro status
      const { data: proData } = await supabase
        .from('pro_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (proData && currentRole === 'client') {
        currentRole = 'pro';
      }

      console.log('MobileProfileSettings - Current role:', currentRole, 'Role data:', roleData, 'Pro data:', proData);
      setUserRole(currentRole);

      // Load categories
      console.log('Loading categories from categories table...');
      const { data: catsData, error: catsError } = await supabase
        .from('categories')
        .select('id, label_ru, label_ro')
        .order('label_ru');

      console.log('Categories loaded:', catsData?.length || 0, 'Error:', catsError);
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

        const selectedCategoryIds = (catData || []).map(c => String(c.category_id));
        console.log('Loaded selected categories:', selectedCategoryIds);
        setSelectedCategories(selectedCategoryIds);

        // Load availability schedule
        const { data: availData } = await supabase
          .from('pro_availability')
          .select('*')
          .eq('user_id', user.id)
          .order('weekday');

        setAvailability(availData || []);
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
          avatar_url: profile.avatar_url || null,
          latitude: profile.latitude ?? null,
          longitude: profile.longitude ?? null,
          address_line1: profile.address_line1?.trim() || null,
          address_line2: profile.address_line2?.trim() || null,
          postal_code: profile.postal_code?.trim() || null,
          address_notes: profile.address_notes?.trim() || null,
          location_public_label: profile.location_public_label?.trim() || null,
          location_precision: profile.location_precision || null,
          location_source: profile.location_source || null
        });

      if (profileError) throw profileError;

      // Update pro profile if user is a pro
      if (userRole === 'pro') {
        await saveProProfile();
        await saveAvailability();
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
    console.log('Saving categories - selected:', selectedCategories);
    const { data: existing } = await supabase
      .from('pro_categories')
      .select('category_id')
      .eq('user_id', user.id);

    const existingIds = new Set((existing || []).map(x => String(x.category_id)));
    const toAdd = selectedCategories
      .filter(id => !existingIds.has(id))
      .map(id => ({ user_id: user.id, category_id: id }));
    const toRemove = [...existingIds].filter((id: string) => !selectedCategories.includes(id));

    console.log('Categories to add:', toAdd.length, 'to remove:', toRemove.length);

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('pro_categories')
        .insert(toAdd);

      if (error) {
        console.error('Error adding categories:', error);
        throw error;
      } else {
        console.log('Successfully added categories');
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('pro_categories')
        .delete()
        .eq('user_id', user.id)
        .in('category_id', toRemove);

      if (error) {
        console.error('Error removing categories:', error);
        throw error;
      } else {
        console.log('Successfully removed categories');
      }
    }
  };

  const saveAvailability = async () => {
    if (!user) return;

    // Delete existing availability
    await supabase
      .from('pro_availability')
      .delete()
      .eq('user_id', user.id);

    // Insert new availability
    if (availability.length > 0) {
      const { error } = await supabase
        .from('pro_availability')
        .insert(
          availability.map(a => ({
            user_id: user.id,
            weekday: a.weekday,
            start_time: a.start_time,
            end_time: a.end_time
          }))
        );

      if (error) throw error;
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      const resolved = await getCurrentResolvedLocation();
      setProfile(prev => ({
        ...prev,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        address_line1: resolved.address,
        city: resolved.publicLabel || prev.city,
        location_public_label: resolved.publicLabel,
        location_precision: resolved.precision,
        location_source: resolved.source,
      }));
      toast({
        title: 'Локация определена',
        description: resolved.publicLabel || 'Базовый адрес профиля обновлён',
      });
    } catch (error) {
      toast({
        title: 'Не удалось определить локацию',
        description: error instanceof Error ? error.message : 'Попробуйте указать адрес вручную',
        variant: 'destructive',
      });
    }
  };

  const handleResolveAddress = async () => {
    try {
      const query = [profile.address_line1, profile.address_line2, profile.city, profile.country, profile.postal_code]
        .filter(Boolean)
        .join(', ');
      const resolved = await geocodeAddress(query);
      setProfile(prev => ({
        ...prev,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        address_line1: prev.address_line1 || resolved.address,
        city: prev.city || resolved.publicLabel,
        location_public_label: resolved.publicLabel,
        location_precision: resolved.precision,
        location_source: resolved.source,
      }));
      toast({
        title: 'Адрес подтверждён',
        description: resolved.publicLabel || 'Координаты профиля обновлены',
      });
    } catch (error) {
      toast({
        title: 'Адрес не распознан',
        description: error instanceof Error ? error.message : 'Уточните адрес и попробуйте ещё раз',
        variant: 'destructive',
      });
    }
  };

  const updateProfile = (field: keyof Profile, value: Profile[keyof Profile]) => {
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
    console.log('Mobile - Toggling category:', categoryId, 'Current selected:', selectedCategories);
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      console.log('Mobile - New selection:', newSelection);
      return newSelection;
    });
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
      { id: 'categories', label: 'Категории', icon: Wrench },
      { id: 'schedule', label: 'График', icon: Calendar },
      { id: 'notifications', label: 'Уведомления', icon: Settings }
    ] : [])
  ];

  console.log('MobileProfileSettings - User role:', userRole, 'Tab items:', tabItems.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-neo flex items-center justify-center">
        <MobileCard className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Загружаем профиль...</p>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo">
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
                    ? 'bg-neo neo-inset-4 text-black'
                    : 'bg-neo neo-8 text-gray-600'
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
              <MobileAvatarUpload
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
                Базовый адрес клиента
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline" onClick={handleUseCurrentLocation}>
                    Определить геолокацию
                  </Button>
                  <Button type="button" variant="outline" onClick={handleResolveAddress}>
                    Подтвердить адрес
                  </Button>
                </div>
                <div>
                  <Label htmlFor="addressLine1">Адрес</Label>
                  <Input
                    id="addressLine1"
                    value={profile.address_line1}
                    onChange={(e) => updateProfile('address_line1', e.target.value)}
                    placeholder="Улица, дом"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2">Квартира / подъезд / этаж</Label>
                  <Input
                    id="addressLine2"
                    value={profile.address_line2}
                    onChange={(e) => updateProfile('address_line2', e.target.value)}
                    placeholder="Дополнительные детали адреса"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city">Город</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => updateProfile('city', e.target.value)}
                      placeholder="Город"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Индекс</Label>
                    <Input
                      id="postalCode"
                      value={profile.postal_code}
                      onChange={(e) => updateProfile('postal_code', e.target.value)}
                      placeholder="Почтовый индекс"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Страна</Label>
                  <Input
                    id="country"
                    value={profile.country}
                    onChange={(e) => updateProfile('country', e.target.value)}
                    placeholder="Страна"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="publicLabel">Публичная зона для специалистов</Label>
                  <Input
                    id="publicLabel"
                    value={profile.location_public_label}
                    onChange={(e) => updateProfile('location_public_label', e.target.value)}
                    placeholder="Например: Центр, Кишинёв"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    До принятия заказа специалистам лучше показывать район/город, а не точный адрес.
                  </p>
                </div>
                <div>
                  <Label htmlFor="addressNotes">Комментарий для доступа</Label>
                  <Textarea
                    id="addressNotes"
                    value={profile.address_notes}
                    onChange={(e) => updateProfile('address_notes', e.target.value)}
                    placeholder="Домофон, ориентир, парковка, особенности входа"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="latitude">Широта</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={profile.latitude ?? ''}
                      onChange={(e) => updateProfile('latitude', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="47.0105"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Долгота</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={profile.longitude ?? ''}
                      onChange={(e) => updateProfile('longitude', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="28.8638"
                      className="mt-1"
                    />
                  </div>
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
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Выберите категории, в которых вы предоставляете услуги:
                </p>

                <MobileCategorySelector
                  categories={categories}
                  selectedCategories={selectedCategories}
                  onSelectionChange={setSelectedCategories}
                  placeholder="Выберите категории услуг"
                  maxSelection={20}
                  disabled={categories.length === 0}
                />

                {categories.length === 0 && (
                  <div className="p-6 text-center text-gray-500 bg-neo rounded-2xl neo-inset-2">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Нет доступных категорий</p>
                    <p className="text-xs mt-1">Попробуйте обновить страницу</p>
                  </div>
                )}
              </div>
            </MobileCard>
          </div>
        )}

        {/* Schedule Tab - График работы */}
        {activeTab === 'schedule' && userRole === 'pro' && (
          <div className="space-y-6">
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                График работы
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Укажите дни и время, когда вы доступны для выполнения заказов
              </p>

              <div className="space-y-4">
                {[
                  { id: 1, name: 'Понедельник', short: 'Пн' },
                  { id: 2, name: 'Вторник', short: 'Вт' },
                  { id: 3, name: 'Среда', short: 'Ср' },
                  { id: 4, name: 'Четверг', short: 'Чт' },
                  { id: 5, name: 'Пятница', short: 'Пт' },
                  { id: 6, name: 'Суббота', short: 'Сб' },
                  { id: 0, name: 'Воскресенье', short: 'Вс' }
                ].map((day) => {
                  const schedule = availability.find(a => a.weekday === day.id);
                  const isActive = !!schedule;

                  return (
                    <div key={day.id} className="p-4 rounded-xl bg-neo neo-inset-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neo neo-4 flex items-center justify-center">
                            <span className="text-xs font-medium">{day.short}</span>
                          </div>
                          <span className="font-medium">{day.name}</span>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAvailability(prev => [...prev, {
                                weekday: day.id,
                                start_time: '09:00',
                                end_time: '18:00'
                              }]);
                            } else {
                              setAvailability(prev => prev.filter(a => a.weekday !== day.id));
                            }
                          }}
                        />
                      </div>

                      {isActive && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Начало</Label>
                            <Input
                              type="time"
                              value={schedule?.start_time || '09:00'}
                              onChange={(e) => {
                                setAvailability(prev =>
                                  prev.map(a =>
                                    a.weekday === day.id
                                      ? { ...a, start_time: e.target.value }
                                      : a
                                  )
                                );
                              }}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Окончание</Label>
                            <Input
                              type="time"
                              value={schedule?.end_time || '18:00'}
                              onChange={(e) => {
                                setAvailability(prev =>
                                  prev.map(a =>
                                    a.weekday === day.id
                                      ? { ...a, end_time: e.target.value }
                                      : a
                                  )
                                );
                              }}
                              className="mt-1 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Время автоматического ответа</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Специалисты с быстрым временем ответа получают больше заказов
                    </p>
                  </div>
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && userRole === 'pro' && (
          <div className="space-y-4">
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Настройки уведомлений
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Управляйте способами получения уведомлений
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Новые заказы</label>
                    <p className="text-xs text-muted-foreground">Получать уведомления о новых заказах</p>
                  </div>
                  <Switch
                    checked={notifications.newJobs}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, newJobs: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">SMS уведомления</label>
                    <p className="text-xs text-muted-foreground">Получать SMS уведомления</p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, sms: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Email уведомления</label>
                    <p className="text-xs text-muted-foreground">Получать уведомления на почту</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Push уведомления</label>
                    <p className="text-xs text-muted-foreground">Получать push уведомления в приложении</p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, push: checked }))
                    }
                  />
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Save Button */}
        <MobileCard>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-neo neo-8 hover:neo-4 text-gray-700"
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