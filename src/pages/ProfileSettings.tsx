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
  Briefcase
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
    // Reload profile data for new role
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
      // Load pro profile
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

      // Load selected categories
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
          locale: profile.locale || 'ru'
        });

      if (profileError) throw profileError;

      // Update pro profile if user is a pro
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
    <main className="min-h-screen">
      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate(-1)} className="card-surface">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Настройки профиля
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Управляйте своими личными данными и настройками
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Avatar */}
              <div className="card-surface p-8 text-center">
                <h2 className="text-2xl font-semibold mb-6 flex items-center justify-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
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
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Основная информация
                </h2>
                
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Имя</Label>
                      <Input
                        id="first_name"
                        placeholder="Введите ваше имя"
                        value={profile.first_name}
                        onChange={(e) => updateProfile('first_name', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Фамилия</Label>
                      <Input
                        id="last_name"
                        placeholder="Введите вашу фамилию"
                        value={profile.last_name}
                        onChange={(e) => updateProfile('last_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+373 XX XXX XXX"
                        value={profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Местоположение
                </h2>
                
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city">Город</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="city"
                          placeholder="Кишинёв"
                          value={profile.city}
                          onChange={(e) => updateProfile('city', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Страна</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="country"
                          placeholder="Молдова"
                          value={profile.country}
                          onChange={(e) => updateProfile('country', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Upgrade */}
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
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
                <div className="card-surface p-8">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    <Briefcase className="w-6 h-6 text-primary" />
                    Настройки специалиста
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="bio">О себе</Label>
                      <Textarea
                        id="bio"
                        placeholder="Расскажите о своем опыте и услугах..."
                        value={proProfile.bio}
                        onChange={(e) => updateProProfile('bio', e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="radius">Радиус работы (км)</Label>
                        <Input
                          id="radius"
                          type="number"
                          min="1"
                          value={proProfile.radius_km}
                          onChange={(e) => updateProProfile('radius_km', Number(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="hourly">Ставка (¢/час)</Label>
                        <Input
                          id="hourly"
                          type="number"
                          min="0"
                          value={proProfile.hourly_rate_cents}
                          onChange={(e) => updateProProfile('hourly_rate_cents', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="fixed">Фикс. цена (¢)</Label>
                        <Input
                          id="fixed"
                          type="number"
                          min="0"
                          value={proProfile.fixed_price_cents}
                          onChange={(e) => updateProProfile('fixed_price_cents', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {categories.length > 0 && (
                      <div className="space-y-3">
                        <Label>Категории услуг</Label>
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-3 border rounded-md">
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category.id}`}
                                checked={selectedCategories.includes(category.id)}
                                onCheckedChange={() => toggleCategory(category.id)}
                              />
                              <Label 
                                htmlFor={`category-${category.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {category.name || category.name_ro}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="card-surface p-6">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="btn-hero w-full text-lg py-3"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8 mt-8">
              {/* Account Info */}
              <div className="card-surface p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  Информация об аккаунте
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-sm">{user?.email}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-medium text-sm font-mono">{user?.id.slice(-8)}</span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">Статус:</span>
                    <span className="font-medium text-sm text-success">Активен</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="card-surface p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Советы
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>• Указание реального имени и фамилии поможет клиентам узнать вас</p>
                  <p>• Корректный номер телефона важен для связи</p>
                  <p>• Местоположение поможет в поиске заказов поблизости</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}