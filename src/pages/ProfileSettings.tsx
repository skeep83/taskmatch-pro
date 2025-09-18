import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserRole, UserRole } from "@/lib/userRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/AvatarUpload";
import { RoleUpgrade } from "@/components/RoleUpgrade";
import { 
  User, 
  ArrowLeft, 
  Save,
  Phone,
  MapPin,
  Globe,
  Settings,
  Briefcase,
  Bell,
  UserCog
} from "lucide-react";

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  city?: string;
  country?: string;
  locale?: string;
  avatar_url?: string;
}

interface ProProfile {
  bio?: string;
  radius_km?: number;
  hourly_rate_cents?: number | '';
  fixed_price_cents?: number | '';
}

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile>({
    id: '',
    first_name: '',
    last_name: '',
    full_name: '',
    phone: '',
    city: '',
    country: '',
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
  const [userRole, setUserRole] = useState<UserRole>('client');
  const [showProSettings, setShowProSettings] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);
      await loadUserRole(user.id);
      await loadCategories();
      await loadProfile(user.id);
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({ 
        title: "Ошибка", 
        description: error.message || "Ошибка аутентификации", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          id: data.id,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
          city: data.city || '',
          country: data.country || '',
          locale: data.locale || 'ru',
          avatar_url: data.avatar_url || ''
        });
      }

      // Load pro profile if user is a pro
      if (userRole === 'pro') {
        await loadProProfile(userId);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить профиль",
        variant: "destructive"
      });
    }
  };

  const loadUserRole = async (userId: string) => {
    try {
      const result = await getUserRole(userId);
      if (result.success) {
        setUserRole(result.role);
        setShowProSettings(result.role === 'pro');
      }
    } catch (error: any) {
      console.error('Error loading user role:', error);
    }
  };

  const handleRoleUpgraded = (newRole: UserRole) => {
    setUserRole(newRole);
    setShowProSettings(newRole === 'pro');
    if (user) {
      loadProfile(user.id);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, name_ro')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProProfile = async (userId: string) => {
    try {
      const { data: proData, error: proError } = await supabase
        .from('pro_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (proError) throw proError;

      if (proData) {
        setProProfile({
          bio: proData.bio || '',
          radius_km: proData.radius_km || 10,
          hourly_rate_cents: proData.hourly_rate_cents || '',
          fixed_price_cents: proData.fixed_price_cents || ''
        });
      }

      const { data: catData, error: catError } = await supabase
        .from('pro_categories')
        .select('category_id')
        .eq('user_id', userId);

      if (catError) throw catError;

      setSelectedCategories((catData || []).map(c => c.category_id));
    } catch (error: any) {
      console.error('Error loading pro profile:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const fullName = `${profile.first_name?.trim() || ''} ${profile.last_name?.trim() || ''}`.trim();
      
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
          locale: profile.locale || 'ru'
        });

      if (profileError) throw profileError;

      if (showProSettings) {
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="card-surface p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Загружаем профиль...</h1>
          <div className="animate-spin">⏳</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mobile-container">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary/70 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Профиль</h1>
                <span className="text-xs text-muted-foreground">Настройки</span>
              </div>
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header Section */}
      <section className="hidden md:block container mx-auto py-8 sm:py-16 px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate(-1)} className="card-surface">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
          
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 sm:mb-6 text-gradient">
            Настройки профиля
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Управляйте своими личными данными и настройками
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            {/* Profile Form */}
            <div className="lg:col-span-2 space-y-4 md:space-y-8">
              {/* Avatar */}
              <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-4 md:p-8 text-center">
                <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center justify-center gap-2 md:gap-3">
                  <div className="w-1 h-6 md:h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Фото профиля
                </h2>
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile.avatar_url}
                  userName={`${profile.first_name} ${profile.last_name}`.trim()}
                  onAvatarUpdate={handleAvatarUpdate}
                />
              </div>

              {/* Basic Information */}
              <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-4 md:p-8">
                <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                  <div className="w-1 h-6 md:h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Основная информация
                </h2>
                
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-sm">Имя</Label>
                      <Input
                        id="first_name"
                        placeholder="Введите ваше имя"
                        value={profile.first_name}
                        onChange={(e) => updateProfile('first_name', e.target.value)}
                        className="text-sm md:text-base"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-sm">Фамилия</Label>
                      <Input
                        id="last_name"
                        placeholder="Введите вашу фамилию"
                        value={profile.last_name}
                        onChange={(e) => updateProfile('last_name', e.target.value)}
                        className="text-sm md:text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Телефон</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+373 XX XXX XXX"
                        value={profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        className="pl-10 text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-4 md:p-8">
                <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                  <div className="w-1 h-6 md:h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Местоположение
                </h2>
                
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">Город</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="city"
                          placeholder="Кишинёв"
                          value={profile.city}
                          onChange={(e) => updateProfile('city', e.target.value)}
                          className="pl-10 text-sm md:text-base"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm">Страна</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="country"
                          placeholder="Молдова"
                          value={profile.country}
                          onChange={(e) => updateProfile('country', e.target.value)}
                          className="pl-10 text-sm md:text-base"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Upgrade */}
              <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-4 md:p-8">
                <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                  <div className="w-1 h-6 md:h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Статус аккаунта
                </h2>
                <RoleUpgrade 
                  userId={user.id} 
                  currentRole={userRole} 
                  onRoleUpgraded={handleRoleUpgraded}
                />
              </div>

              {/* Professional Settings */}
              {showProSettings && (
                <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-4 md:p-8">
                  <h2 className="text-lg md:text-2xl font-semibold mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                    <div className="w-1 h-6 md:h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    Настройки специалиста
                  </h2>
                  
                  <div className="space-y-4 md:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-sm">О себе</Label>
                      <Textarea
                        id="bio"
                        placeholder="Расскажите о своем опыте и навыках..."
                        value={proProfile.bio}
                        onChange={(e) => updateProProfile('bio', e.target.value)}
                        rows={3}
                        className="text-sm md:text-base"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="hourly_rate" className="text-sm">Почасовая ставка (лей)</Label>
                        <Input
                          id="hourly_rate"
                          type="number"
                          placeholder="300"
                          value={proProfile.hourly_rate_cents}
                          onChange={(e) => updateProProfile('hourly_rate_cents', e.target.value)}
                          className="text-sm md:text-base"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="radius" className="text-sm">Радиус работы (км)</Label>
                        <Input
                          id="radius"
                          type="number"
                          placeholder="10"
                          value={proProfile.radius_km}
                          onChange={(e) => updateProProfile('radius_km', parseInt(e.target.value) || 10)}
                          className="text-sm md:text-base"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button - Mobile */}
              <div className="md:hidden">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-xl font-semibold text-lg"
                >
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>

            {/* Sidebar - Desktop only */}
            <div className="hidden lg:block space-y-6">
              <Card className="card-surface p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Действия
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-surface p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Советы
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>• Добавьте фото для повышения доверия</p>
                    <p>• Заполните все поля профиля</p>
                    <p>• Местоположение поможет в поиске заказов поблизости</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}