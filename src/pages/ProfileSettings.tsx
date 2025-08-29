import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  ArrowLeft, 
  Save,
  Phone,
  MapPin,
  Globe
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
    locale: 'ru'
  });

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
          locale: data.locale || 'ru'
        });
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

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update full_name based on first_name and last_name
      const fullName = `${profile.first_name?.trim() || ''} ${profile.last_name?.trim() || ''}`.trim();
      
      const { error } = await supabase
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

      if (error) throw error;

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

  const updateProfile = (field: keyof Profile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
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