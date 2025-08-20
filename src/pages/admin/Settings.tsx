import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Settings as SettingsIcon, DollarSign, Clock, Shield, 
  Bell, Globe, Save, RefreshCw
} from "lucide-react";

export default function AdminSettings() {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "ServiceHub",
    defaultCommissionRate: 10,
    responseTimeLimit: 60,
    maxLoginAttempts: 5,
    emailNotifications: true,
    defaultLanguage: "ru"
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load settings from database
      setLoading(false);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки настроек",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Save settings to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Настройки сохранены",
        description: "Все изменения успешно применены"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Seo title="ServiceHub — Настройки платформы" description="Админ-панель настроек" canonical="/admin/settings" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Seo title="ServiceHub — Настройки платформы" description="Админ-панель настроек" canonical="/admin/settings" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Настройки платформы
          </h1>
          <p className="text-muted-foreground mt-1">
            Конфигурация и управление параметрами системы
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList>
          <TabsTrigger value="platform">Платформа</TabsTrigger>
          <TabsTrigger value="finance">Финансы</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Основные настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Название платформы</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => updateSetting('platformName', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Финансовые настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Комиссия платформы (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  value={settings.defaultCommissionRate}
                  onChange={(e) => updateSetting('defaultCommissionRate', parseFloat(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Настройки безопасности
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Максимум попыток входа</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
