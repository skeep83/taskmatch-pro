import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildQuickResponseNote, submitJobResponse } from '@/lib/jobResponseSubmission';
import { useEnhancedI18n } from "@/i18n/enhanced";
import {
  Clock,
  Shield,
  DollarSign,
  Calendar,
  MessageCircle,
  Send,
  Lightbulb
} from 'lucide-react';

interface QuickResponseFormProps {
  jobId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
  price_cents: number;
  warranty_days: number;
}

export const QuickResponseForm: React.FC<QuickResponseFormProps> = ({
  jobId,
  onSuccess,
  onCancel,
  className
}) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    price: '',
    estimatedHours: '',
    warrantyDays: '30',
    etaDate: '',
    comment: '',
    templateId: ''
  });
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const etaOptions = [
    { value: 'today', label: t("hero.mock.urgency") },
    { value: 'tomorrow', label: t("ui.zavtra") },
    { value: '2-3-days', label: t("ui.2_3_dnia") },
    { value: 'this-week', label: t("ui.na_etoi_nedele") },
    { value: 'next-week', label: t("ui.na_sleduiuschei_nedele") },
    { value: 'custom', label: t("ui.vybrat_datu") }
  ];

  const warrantyOptions = [
    { value: '0', label: t("ui.bez_garantii") },
    { value: '7', label: t("ui.7_dnei") },
    { value: '30', label: t("ui.30_dnei") },
    { value: '90', label: t("ui.3_mesiaca") },
    { value: '180', label: t("ui.6_mesiacev") },
    { value: '365', label: t("ui.1_god") }
  ];

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('response_templates')
        .select('*')
        .eq('provider_id', user.id)
        .order('is_default', { ascending: false });

      if (data) {
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        templateId,
        comment: template.content,
        price: (template.price_cents / 100).toString(),
        warrantyDays: template.warranty_days.toString()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.price || !formData.comment) {
      toast({
        title: t("notifications.error"),
        description: t("ui.zapolnite_cenu_i_kommentarii"),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const priceInCents = Math.round(parseFloat(formData.price) * 100);

      const estimatedHours = formData.estimatedHours ? parseInt(formData.estimatedHours, 10) : undefined;
      const selectedEtaLabel = etaOptions.find(option => option.value === formData.etaDate)?.label;
      const note = buildQuickResponseNote(formData.comment, {
        etaLabel: selectedEtaLabel,
        etaDate: formData.etaDate,
        estimatedHours,
      });

      const { error } = await submitJobResponse({
        jobId,
        priceCents: priceInCents,
        warrantyDays: parseInt(formData.warrantyDays, 10),
        etaSlot: formData.etaDate,
        note,
      });

      if (error) throw error;

      toast({
        title: t("ui.predlozhenie_otpravleno"),
        description: t("ui.vashe_predlozhenie_uspeshno_otpravleno_2")
      });

      onSuccess?.();
    } catch (error: unknown) {
      console.error('Error submitting response:', error);
      const message = error instanceof Error ? error.message : String(error ?? '');
      const duplicateResponse =
        (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505')
        || /duplicate key/i.test(message)
        || /already applied/i.test(message);
      const unauthorized = /not authorized|row-level security|violates row-level security|JWT|auth/i.test(message);

      toast({
        title: duplicateResponse ? t("ui.predlozhenie_uzhe_otpravleno") : t("notifications.error"),
        description: duplicateResponse
          ? t("ui.vy_uzhe_otpravili_predlozhenie_2")
          : unauthorized
            ? t("ui.snachala_voidite_v_akkaunt_2")
            : (message || t("ui.ne_udalos_otpravit_predlozhenie")),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Send size={20} className="text-primary" />
        </div>
        <h3 className="text-xl font-semibold">{t("ui.bystroe_predlozhenie")}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Шаблоны */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Использовать шаблон
            </label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t("ui.vyberite_shablon_otveta")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {template.price_cents / 100} MDL
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Основные поля */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <DollarSign size={16} className="inline mr-1" />
              Цена (MDL) *
            </label>
            <Input
              type="number"
              placeholder="500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              min="1"
              step="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Shield size={16} className="inline mr-1" />
              Гарантия
            </label>
            <Select
              value={formData.warrantyDays}
              onValueChange={(value) => setFormData({ ...formData, warrantyDays: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warrantyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Готовность к выезду */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Calendar size={16} className="inline mr-1" />
            Готов выехать
          </label>
          <Select
            value={formData.etaDate}
            onValueChange={(value) => setFormData({ ...formData, etaDate: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("ui.vyberite_vremia")} />
            </SelectTrigger>
            <SelectContent>
              {etaOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Дополнительные поля */}
        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock size={16} className="inline mr-1" />
              Время работы (часов)
            </label>
            <Input
              type="number"
              placeholder="4"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              min="0.5"
              step="0.5"
            />
          </div>
        )}

        {/* Комментарий */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <MessageCircle size={16} className="inline mr-1" />
            Комментарий *
          </label>
          <Textarea
            placeholder={t("ui.opishite_kak_vy_vypolnite")}
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            rows={4}
            required
          />
        </div>

        {/* Дополнительные опции */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
          >
            <Lightbulb size={16} />
            {showAdvanced ? t("ui.skryt") : t("ui.dopolnitelno")}
          </Button>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{t("ui.gotov_vyehat_zavtra")}</span>
          </div>
        </div>

        {/* Действия */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Отправка...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Отправить предложение
              </>
            )}
          </Button>

          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          )}
        </div>

        {/* Подсказка */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Lightbulb size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">{t("ui.sovet_dlia_uspeshnogo_predlozheniia")}</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                <li>{t("ui.ukazhite_realistichnuiu_cenu")}</li>
                <li>{t("ui.detalno_opishite_plan_rabot")}</li>
                <li>{t("ui.predlozhite_garantiiu_na_rezultat")}</li>
                <li>{t("ui.budte_gotovy_k_bystromu")}</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
};