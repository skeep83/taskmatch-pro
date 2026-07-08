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
import { PaymentMethodsCard } from '@/components/PaymentMethodsCard';
import { UserReviews } from '@/components/UserReviews';
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
        title: t("notifications.error"),
        description: t("ui.ne_udalos_zagruzit_dannye"),
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
        title: t("dash.client.profile_updated"),
        description: t("ui.vashi_dannye_uspeshno_sohraneny")
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_sohranit_profil"),
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
        title: t("ui.lokaciia_opredelena"),
        description: resolved.publicLabel || t("ui.bazovyi_adres_profilia_obnovlen"),
      });
    } catch (error) {
      toast({
        title: t("ui.ne_udalos_opredelit_lokaciiu"),
        description: error instanceof Error ? error.message : t("ui.poprobuite_ukazat_adres_vruchnuiu"),
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
        title: t("ui.adres_podtverzhden"),
        description: resolved.publicLabel || t("ui.koordinaty_profilia_obnovleny"),
      });
    } catch (error) {
      toast({
        title: t("ui.adres_ne_raspoznan"),
        description: error instanceof Error ? error.message : t("ui.utochnite_adres_i_poprobuite"),
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
    { id: 'basic', label: t("ui.osnovnoe"), icon: User },
    { id: 'contact', label: t("ui.kontakty"), icon: Phone },
    ...(userRole === 'pro' ? [
      { id: 'professional', label: t("menu.role_pro"), icon: Briefcase },
      { id: 'categories', label: t("ui.kategorii"), icon: Wrench },
      { id: 'schedule', label: t("ui.grafik"), icon: Calendar },
      { id: 'notifications', label: t("dash.client.notifications"), icon: Settings }
    ] : [])
  ];

  console.log('MobileProfileSettings - User role:', userRole, 'Tab items:', tabItems.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-neo flex items-center justify-center">
        <MobileCard className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>{t("ui.zagruzhaem_profil")}</p>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo">
      <MobileHeader
        title={t("menu.profile_settings")}
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
                {t("ui.foto_profilia")}
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
                {t("ui.lichnaia_informaciia")}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firstName">{t("ui.imia")}</Label>
                  <Input
                    id="firstName"
                    value={profile.first_name}
                    onChange={(e) => updateProfile('first_name', e.target.value)}
                    placeholder={t("ui.vvedite_imia")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t("ui.familiia")}</Label>
                  <Input
                    id="lastName"
                    value={profile.last_name}
                    onChange={(e) => updateProfile('last_name', e.target.value)}
                    placeholder={t("ui.vvedite_familiiu")}
                    className="mt-1"
                  />
                </div>
              </div>
            </MobileCard>

            {/* Location */}
            <MobileCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("ui.bazovyi_adres_klienta")}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline" onClick={handleUseCurrentLocation}>
                    {t("ui.opredelit_geolokaciiu")}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleResolveAddress}>
                    {t("ui.podtverdit_adres")}
                  </Button>
                </div>
                <div>
                  <Label htmlFor="addressLine1">{t("ui.adres")}</Label>
                  <Input
                    id="addressLine1"
                    value={profile.address_line1}
                    onChange={(e) => updateProfile('address_line1', e.target.value)}
                    placeholder={t("ui.ulica_dom")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2">{t("ui.kvartira_podezd_etazh")}</Label>
                  <Input
                    id="addressLine2"
                    value={profile.address_line2}
                    onChange={(e) => updateProfile('address_line2', e.target.value)}
                    placeholder={t("ui.dopolnitelnye_detali_adresa")}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city">{t("ui.gorod")}</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => updateProfile('city', e.target.value)}
                      placeholder={t("ui.gorod")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">{t("ui.indeks")}</Label>
                    <Input
                      id="postalCode"
                      value={profile.postal_code}
                      onChange={(e) => updateProfile('postal_code', e.target.value)}
                      placeholder={t("ui.pochtovyi_indeks")}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">{t("ui.strana")}</Label>
                  <Input
                    id="country"
                    value={profile.country}
                    onChange={(e) => updateProfile('country', e.target.value)}
                    placeholder={t("ui.strana")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="publicLabel">{t("ui.publichnaia_zona_dlia_specialistov")}</Label>
                  <Input
                    id="publicLabel"
                    value={profile.location_public_label}
                    onChange={(e) => updateProfile('location_public_label', e.target.value)}
                    placeholder={t("ui.naprimer_centr_kishinev")}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("ui.do_priniatiia_zakaza_specialistam")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="addressNotes">{t("ui.kommentarii_dlia_dostupa")}</Label>
                  <Textarea
                    id="addressNotes"
                    value={profile.address_notes}
                    onChange={(e) => updateProfile('address_notes', e.target.value)}
                    placeholder={t("ui.domofon_orientir_parkovka_osobennosti")}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="latitude">{t("ui.shirota")}</Label>
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
                    <Label htmlFor="longitude">{t("ui.dolgota")}</Label>
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
                {t("ui.kontaktnye_dannye")}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">{t("dash.client.phone")}</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    placeholder={t("ui.vvedite_nomer_telefona")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="locale">{t("ui.iazyk_interfeisa")}</Label>
                  <select
                    id="locale"
                    value={profile.locale}
                    onChange={(e) => updateProfile('locale', e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  >
                    <option value="ru">{t("ui.russkii")}</option>
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
                {t("ui.professionalnaia_informaciia")}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio">{t("ui.o_sebe")}</Label>
                  <Textarea
                    id="bio"
                    value={proProfile.bio}
                    onChange={(e) => updateProProfile('bio', e.target.value)}
                    placeholder={t("ui.rasskazhite_o_svoem_opyte_2")}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="radius">{t("ui.radius_raboty_km")}</Label>
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
                {t("ui.stoimost_uslug")}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hourlyRate">{t("ui.pochasovaia_stavka_kopeiki")}</Label>
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
                  <Label htmlFor="fixedPrice">{t("ui.fiksirovannaia_cena_kopeiki")}</Label>
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
                {t("ui.kategorii_uslug")}
              </h3>
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  {t("ui.vyberite_kategorii_v_kotoryh")}
                </p>

                <MobileCategorySelector
                  categories={categories}
                  selectedCategories={selectedCategories}
                  onSelectionChange={setSelectedCategories}
                  placeholder={t("ui.vyberite_kategorii_uslug")}
                  maxSelection={20}
                  disabled={categories.length === 0}
                />

                {categories.length === 0 && (
                  <div className="p-6 text-center text-gray-500 bg-neo rounded-2xl neo-inset-2">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t("ui.net_dostupnyh_kategorii")}</p>
                    <p className="text-xs mt-1">{t("ui.poprobuite_obnovit_stranicu")}</p>
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
                {t("ui.grafik_raboty")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("ui.ukazhite_dni_i_vremia")}
              </p>

              <div className="space-y-4">
                {[
                  { id: 1, name: t("ui.ponedelnik"), short: t("ui.pn") },
                  { id: 2, name: t("ui.vtornik"), short: t("ui.vt") },
                  { id: 3, name: t("ui.sreda"), short: t("ui.sr") },
                  { id: 4, name: t("ui.chetverg"), short: t("ui.cht") },
                  { id: 5, name: t("ui.piatnica"), short: t("ui.pt") },
                  { id: 6, name: t("ui.subbota"), short: t("ui.sb") },
                  { id: 0, name: t("ui.voskresene"), short: t("ui.vs") }
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
                            <Label className="text-xs">{t("ui.nachalo")}</Label>
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
                            <Label className="text-xs">{t("ui.okonchanie")}</Label>
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
                    <p className="text-sm font-medium text-blue-900">{t("ui.vremia_avtomaticheskogo_otveta")}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {t("ui.specialisty_s_bystrym_vremenem")}
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
                {t("ui.nastroiki_uvedomlenii")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("ui.upravliaite_sposobami_polucheniia_uvedom")}
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">{t("ui.novye_zakazy")}</label>
                    <p className="text-xs text-muted-foreground">{t("ui.poluchat_uvedomleniia_o_novyh")}</p>
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
                    <label className="text-sm font-medium">{t("dash.client.sms_notif")}</label>
                    <p className="text-xs text-muted-foreground">{t("ui.poluchat_sms_uvedomleniia")}</p>
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
                    <label className="text-sm font-medium">{t("dash.client.email_notif")}</label>
                    <p className="text-xs text-muted-foreground">{t("ui.poluchat_uvedomleniia_na_pochtu")}</p>
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
                    <label className="text-sm font-medium">{t("ui.push_uvedomleniia")}</label>
                    <p className="text-xs text-muted-foreground">{t("ui.poluchat_push_uvedomleniia_v")}</p>
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

        {/* Payment methods (parity with desktop) */}
        {user?.id && <PaymentMethodsCard userId={user.id} />}

        {/* Reviews about me */}
        {user?.id && (
          <MobileCard>
            <h3 className="font-semibold mb-3">{t("reviews.about_me")}</h3>
            <UserReviews userId={user.id} limit={4} showHeader={false} />
          </MobileCard>
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
                {t("ui.sohraniaem")}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {t("dash.client.save_changes")}
              </div>
            )}
          </Button>
        </MobileCard>
      </div>
    </div>
  );
}