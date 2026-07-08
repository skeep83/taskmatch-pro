import { useState, useEffect } from "react";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { PaymentMethodsCard } from "@/components/PaymentMethodsCard";
import { UserReviews } from "@/components/UserReviews";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel } from '@/lib/categoryLabel';
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
  Briefcase, Star } from "lucide-react";

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
  latitude?: number | null;
  longitude?: number | null;
}

interface ProProfile {
  bio?: string;
  radius_km?: number;
  hourly_rate_cents?: number | '';
  fixed_price_cents?: number | '';
}

export default function ProfileSettings() {
  const { t, language } = useEnhancedI18n();
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
    avatar_url: '',
    latitude: null,
    longitude: null
  });
  const [proProfile, setProProfile] = useState<ProProfile>({
    bio: '',
    radius_km: 10,
    hourly_rate_cents: '',
    fixed_price_cents: ''
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState<string>('');
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
        title: t("notifications.error"),
        description: error.message || t("dash.biz.auth_error"),
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
          avatar_url: data.avatar_url || '',
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null
        });
      }

      // Load pro profile if user is a pro
      if (userRole === 'pro') {
        await loadProProfile(userId);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_zagruzit_profil"),
        variant: "destructive"
      });
    }
  };

  const loadUserRole = async (userId: string) => {
    try {
      const result = await getUserRole(userId);
      if (result.success) {
        setUserRole(result.role);
      }
      // Show pro settings whenever the user HAS the pro role,
      // even if their primary role is business/client
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      const roles = (roleRows || []).map(r => String(r.role));
      setShowProSettings(roles.includes('pro'));
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
        .from('categories')
        .select('id, key, label_ru, label_ro')
        .order('label_ru');

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = (data || []).map(cat => ({
        id: cat.id,
        key: cat.key,
        name: categoryLabel(cat, language),
        name_ro: cat.label_ro
      }));

      setCategories(transformedData);
      console.log('Loaded categories:', transformedData.length);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_zagruzit_kategorii"),
        variant: "destructive"
      });
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
          locale: profile.locale || 'ru',
          latitude: profile.latitude ?? null,
          longitude: profile.longitude ?? null
        });

      if (profileError) throw profileError;

      // Update pro profile if user is a pro
      if (showProSettings) {
        await saveProProfile();
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

  const updateProfile = (field: keyof Profile, value: string | number | null) => {
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
    console.log('Toggling category:', categoryId, 'Current selected:', selectedCategories);
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
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
          <h1 className="text-2xl font-bold mb-4">{t("ui.zagruzhaem_profil")}</h1>
          <div className="animate-spin">⏳</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Header Section */}
      <section className="container mx-auto py-6 md:py-10 px-4 md:px-6">
        <div className="max-w-7xl mx-auto mb-6 md:mb-8 flex items-start gap-4">
          <Button variant="outline" onClick={() => navigate(-1)} className="shrink-0 h-10 w-10 p-0 rounded-xl" aria-label={t("ui.nazad")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            {t("menu.profile_settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("ui.upravliaite_svoimi_lichnymi_dannymi")}
          </p>
          </div>
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
                  {t("ui.foto_profilia")}
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
                  {t("ui.osnovnaia_informaciia")}
                </h2>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">{t("ui.imia")}</Label>
                      <Input
                        id="first_name"
                        placeholder={t("ui.vvedite_vashe_imia")}
                        value={profile.first_name}
                        onChange={(e) => updateProfile('first_name', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name">{t("ui.familiia")}</Label>
                      <Input
                        id="last_name"
                        placeholder={t("ui.vvedite_vashu_familiiu")}
                        value={profile.last_name}
                        onChange={(e) => updateProfile('last_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("dash.client.phone")}</Label>
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
                  {t("ui.mestopolozhenie")}
                </h2>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city">{t("ui.gorod")}</Label>
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
                      <Label htmlFor="country">{t("ui.strana")}</Label>
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

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">{t("ui.shirota")}</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={profile.latitude ?? ''}
                        onChange={(e) => updateProfile('latitude', e.target.value === '' ? null : Number(e.target.value))}
                        placeholder={t("ui.naprimer_47_0105")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="longitude">{t("ui.dolgota")}</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={profile.longitude ?? ''}
                        onChange={(e) => updateProfile('longitude', e.target.value === '' ? null : Number(e.target.value))}
                        placeholder={t("ui.naprimer_28_8638")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Upgrade */}
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  {t("ui.status_akkaunta")}
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
                    {t("ui.nastroiki_specialista")}
                  </h2>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="bio">{t("ui.o_sebe")}</Label>
                      <Textarea
                        id="bio"
                        placeholder={t("ui.rasskazhite_o_svoem_opyte")}
                        value={proProfile.bio}
                        onChange={(e) => updateProProfile('bio', e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="radius">{t("ui.radius_raboty_km")}</Label>
                        <Input
                          id="radius"
                          type="number"
                          min="1"
                          value={proProfile.radius_km}
                          onChange={(e) => updateProProfile('radius_km', Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hourly">{t("ui.stavka_chas")}</Label>
                        <Input
                          id="hourly"
                          type="number"
                          min="0"
                          value={proProfile.hourly_rate_cents}
                          onChange={(e) => updateProProfile('hourly_rate_cents', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fixed">{t("ui.fiks_cena")}</Label>
                        <Input
                          id="fixed"
                          type="number"
                          min="0"
                          value={proProfile.fixed_price_cents}
                          onChange={(e) => updateProProfile('fixed_price_cents', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Categories Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-medium">{t("ui.kategorii_uslug")}</Label>
                        <span className="text-sm text-muted-foreground">
                          Выбрано: {selectedCategories.length}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {t("ui.vyberite_kategorii_uslug_kotorye")}
                      </p>

                      {/* Search for categories */}
                      <div className="space-y-3">
                        <Input
                          placeholder={t("ui.poisk_kategorii")}
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="w-full"
                        />

                        {/* Quick filters */}
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-muted-foreground">{t("ui.populiarnye")}</span>
                          {[t("landing.cat_plumbing"), t("landing.cat_electric"), t("landing.cat_cleaning"), t("ui.pereezdy_gruzchiki"), t("ui.remont")].map((popular) => (
                            <button
                              key={popular}
                              onClick={() => setCategorySearch(popular)}
                              className="px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                            >
                              {popular}
                            </button>
                          ))}
                          {categorySearch && (
                            <button
                              onClick={() => setCategorySearch('')}
                              className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-full transition-colors"
                            >
                              {t("ui.ochistit")}
                            </button>
                          )}
                        </div>
                      </div>

                      {categories.length === 0 ? (
                        <div className="p-4 border border-dashed border-border rounded-lg text-center">
                          <p className="text-muted-foreground">{t("ui.zagruzhaem_kategorii")}</p>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const filteredCategories = categories.filter(category =>
                              categorySearch === '' ||
                              category.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
                              category.name_ro?.toLowerCase().includes(categorySearch.toLowerCase())
                            );

                            if (filteredCategories.length === 0) {
                              return (
                                <div className="p-6 border border-dashed border-border rounded-lg text-center">
                                  <p className="text-muted-foreground">
                                    Категории не найдены для запроса "{categorySearch}"
                                  </p>
                                  <button
                                    onClick={() => setCategorySearch('')}
                                    className="mt-2 text-sm text-primary hover:underline"
                                  >
                                    {t("ui.pokazat_vse_kategorii")}
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-4 border rounded-lg bg-muted/20">
                                {filteredCategories.map((category) => (
                                  <div key={category.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background/70 transition-colors border border-border/30">
                                    <Checkbox
                                      id={`category-${category.id}`}
                                      checked={selectedCategories.includes(category.id)}
                                      onCheckedChange={() => toggleCategory(category.id)}
                                      className="data-[state=checked]:bg-primary"
                                    />
                                    <Label
                                      htmlFor={`category-${category.id}`}
                                      className="text-sm cursor-pointer flex-1 font-medium leading-snug"
                                      title={`${category.name_ro} (${category.key})`} // Show Romanian translation and key on hover
                                    >
                                      {category.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </>
                      )}

                      {selectedCategories.length > 0 && (
                        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                          <p className="text-sm font-medium text-success mb-3">
                            ✓ Выбранные категории ({selectedCategories.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedCategories.map((catId) => {
                              const category = categories.find(c => c.id === catId);
                              return category ? (
                                <span
                                  key={catId}
                                  className="inline-flex items-center px-3 py-1 bg-success/20 text-success text-sm rounded-full border border-success/30 font-medium"
                                  title={category.name_ro}
                                >
                                  {category.name}
                                  <button
                                    onClick={() => toggleCategory(catId)}
                                    className="ml-2 w-4 h-4 rounded-full bg-success/30 hover:bg-success/50 flex items-center justify-center text-xs transition-colors"
                                    title={t("ui.ubrat_kategoriiu")}
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
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
                  {saving ? t("common.saving") : t("dash.client.save_changes")}
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8 mt-8">
              {/* Account Info */}
              <div className="card-surface p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  {t("ui.informaciia_ob_akkaunte")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-sm truncate min-w-0">{user?.email}</span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-medium text-sm font-mono">{user?.id.slice(-8)}</span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">{t("ui.status")}</span>
                    <span className="font-medium text-sm text-success">{t("ui.aktiven")}</span>
                  </div>
                </div>
              </div>

              {/* Payment methods */}
              {user?.id && <PaymentMethodsCard userId={user.id} />}

              {/* Reviews about me */}
              {user?.id && (
                <div className="card-surface p-6">
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    {t("reviews.about_me")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("reviews.about_me_desc")}</p>
                  <UserReviews userId={user.id} showHeader={false} />
                </div>
              )}

              {/* Tips */}
              <div className="card-surface p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {t("dash.pro.tips")}
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{t("ui.ukazanie_realnogo_imeni_i")}</p>
                  <p>{t("ui.korrektnyi_nomer_telefona_vazhen")}</p>
                  <p>{t("ui.mestopolozhenie_pomozhet_v_poiske")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}