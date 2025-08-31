import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Settings, CreditCard, Shield, DollarSign, Upload, Image as ImageIcon } from "lucide-react";

interface PlatformSettings {
  platformName: string;
  commissionRate: number;
  instantPayoutFee: number;
  maxInstantPayout: number;
  minJobAmount: number;
  maxJobAmount: number;
  enableTwoFA: boolean;
  sessionTimeout: number;
  allowGuestBooking: boolean;
  defaultCurrency: string;
  supportedCurrencies: string[];
  autoCurrencyDetection: boolean;
  currencyConversionEnabled: boolean;
}

interface Currency {
  id: string;
  code: string;
  name_en: string;
  symbol: string;
  is_active: boolean;
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: "ServiceHub",
    commissionRate: 10,
    instantPayoutFee: 2.5,
    maxInstantPayout: 1000,
    minJobAmount: 25,
    maxJobAmount: 10000,
    enableTwoFA: true,
    sessionTimeout: 30,
    allowGuestBooking: false,
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "RUB", "RON"],
    autoCurrencyDetection: true,
    currencyConversionEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load currencies
      const { data: currencyData } = await supabase
        .from('currencies')
        .select('id, code, name_en, symbol, is_active')
        .eq('is_active', true)
        .order('code');
      
      setCurrencies(currencyData || []);

      // Load logo URL from app settings
      const { data: logoData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'logo_url')
        .single();
      
      if (logoData?.value) {
        setLogoUrl(logoData.value as string);
      }

      // Load platform settings
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['default_currency', 'supported_currencies', 'auto_currency_detection', 'currency_conversion_enabled']);

      if (settingsData) {
        const settingsMap = settingsData.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, any>);

        setSettings(prev => ({
          ...prev,
          defaultCurrency: settingsMap.default_currency || "USD",
          supportedCurrencies: settingsMap.supported_currencies || ["USD", "EUR", "RUB", "RON"],
          autoCurrencyDetection: settingsMap.auto_currency_detection || true,
          currencyConversionEnabled: settingsMap.currency_conversion_enabled || true,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save currency settings
      const currencyUpdates = [
        {
          key: 'default_currency',
          value: JSON.stringify(settings.defaultCurrency),
          description: 'Default platform currency code',
          category: 'currency'
        },
        {
          key: 'supported_currencies',
          value: JSON.stringify(settings.supportedCurrencies),
          description: 'List of supported currency codes',
          category: 'currency'
        },
        {
          key: 'auto_currency_detection',
          value: JSON.stringify(settings.autoCurrencyDetection),
          description: 'Automatically detect user currency by location',
          category: 'currency'
        },
        {
          key: 'currency_conversion_enabled',
          value: JSON.stringify(settings.currencyConversionEnabled),
          description: 'Enable automatic currency conversion',
          category: 'currency'
        }
      ];

      for (const update of currencyUpdates) {
        await supabase
          .from('platform_settings')
          .upsert(update, { onConflict: 'key' });
      }
      
      toast({
        title: "Настройки сохранены",
        description: "Все изменения успешно применены",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/png')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, загрузите PNG файл",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка", 
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingLogo(true);
    
    try {
      const fileName = `logo-${Date.now()}.png`;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Save logo URL to app settings
      await supabase
        .from('app_settings')
        .upsert({
          key: 'logo_url',
          value: JSON.stringify(publicUrl)
        }, { onConflict: 'key' });

      setLogoUrl(publicUrl);
      
      toast({
        title: "Логотип загружен",
        description: "Новый логотип успешно установлен",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить логотип",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateSetting = (key: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Настройки платформы</h1>
          <p className="text-muted-foreground">
            Управление конфигурацией системы
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings}>
            Сбросить
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="platform">Платформа</TabsTrigger>
          <TabsTrigger value="branding">Брендинг</TabsTrigger>
          <TabsTrigger value="finance">Финансы</TabsTrigger>
          <TabsTrigger value="currency">Валюты</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Основные настройки
              </CardTitle>
              <CardDescription>
                Общие параметры платформы
              </CardDescription>
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
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="allowGuestBooking"
                  checked={settings.allowGuestBooking}
                  onCheckedChange={(checked) => updateSetting('allowGuestBooking', checked)}
                />
                <Label htmlFor="allowGuestBooking">
                  Разрешить бронирование без регистрации
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Финансовые настройки
              </CardTitle>
              <CardDescription>
                Управление комиссиями и лимитами
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Комиссия платформы (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={settings.commissionRate}
                    onChange={(e) => updateSetting('commissionRate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instantPayoutFee">Комиссия мгновенных выплат (%)</Label>
                  <Input
                    id="instantPayoutFee"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={settings.instantPayoutFee}
                    onChange={(e) => updateSetting('instantPayoutFee', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minJobAmount">Минимальная сумма заказа ($)</Label>
                  <Input
                    id="minJobAmount"
                    type="number"
                    min="1"
                    value={settings.minJobAmount}
                    onChange={(e) => updateSetting('minJobAmount', parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxJobAmount">Максимальная сумма заказа ($)</Label>
                  <Input
                    id="maxJobAmount"
                    type="number"
                    min="1"
                    value={settings.maxJobAmount}
                    onChange={(e) => updateSetting('maxJobAmount', parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxInstantPayout">Лимит мгновенных выплат ($)</Label>
                  <Input
                    id="maxInstantPayout"
                    type="number"
                    min="1"
                    value={settings.maxInstantPayout}
                    onChange={(e) => updateSetting('maxInstantPayout', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Логотип платформы
              </CardTitle>
              <CardDescription>
                Загрузите логотип в формате PNG для отображения в хедере
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="flex items-center gap-3">
                    <img 
                      src={logoUrl} 
                      alt="Current logo" 
                      className="h-12 w-12 object-contain rounded border" 
                    />
                    <div className="text-sm text-muted-foreground">
                      Текущий логотип
                    </div>
                  </div>
                )}
                
                <div className="flex-1">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 transition-colors">
                      <Upload className="h-5 w-5" />
                      <span>
                        {uploadingLogo ? 'Загрузка...' : 'Выберите PNG файл'}
                      </span>
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/png"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Рекомендуемый размер: 40x40px, максимум 5MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Настройки валют
              </CardTitle>
              <CardDescription>
                Управление поддерживаемыми валютами и конвертацией
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Валюта по умолчанию</Label>
                  <Select
                    value={settings.defaultCurrency}
                    onValueChange={(value) => updateSetting('defaultCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите валюту" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Доступные валюты</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {currencies.map((currency) => (
                      <div key={currency.code} className="flex items-center space-x-2">
                        <Switch
                          id={currency.code}
                          checked={settings.supportedCurrencies.includes(currency.code)}
                          onCheckedChange={(checked) => {
                            const updated = checked 
                              ? [...settings.supportedCurrencies, currency.code]
                              : settings.supportedCurrencies.filter(c => c !== currency.code);
                            updateSetting('supportedCurrencies', updated);
                          }}
                        />
                        <Label htmlFor={currency.code} className="text-sm">
                          {currency.symbol} {currency.code}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoCurrencyDetection"
                    checked={settings.autoCurrencyDetection}
                    onCheckedChange={(checked) => updateSetting('autoCurrencyDetection', checked)}
                  />
                  <Label htmlFor="autoCurrencyDetection">
                    Автоопределение валюты по местоположению
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="currencyConversionEnabled"
                    checked={settings.currencyConversionEnabled}
                    onCheckedChange={(checked) => updateSetting('currencyConversionEnabled', checked)}
                  />
                  <Label htmlFor="currencyConversionEnabled">
                    Включить конвертацию валют
                  </Label>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Примечание:</strong> Для управления курсами валют и добавления новых валют 
                  используйте раздел "Валюты" в главном меню админ-панели.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Настройки безопасности
              </CardTitle>
              <CardDescription>
                Параметры безопасности и аутентификации
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Таймаут сессии (минуты)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="480"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value) || 30)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableTwoFA"
                  checked={settings.enableTwoFA}
                  onCheckedChange={(checked) => updateSetting('enableTwoFA', checked)}
                />
                <Label htmlFor="enableTwoFA">
                  Обязательная двухфакторная аутентификация
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}