import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Euro, Clock, FileText, Shield } from 'lucide-react';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { submitJobResponse } from '@/lib/jobResponseSubmission';
import { useEnhancedI18n } from "@/i18n/enhanced";

export default function MobileJobRespond() {
  const { t } = useEnhancedI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobClientId, setJobClientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    price: '',
    eta: '',
    warranty: '30',
    notes: ''
  });

  const fetchJobTitle = useCallback(async (jobId: string) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('jobs')
        .select('title, client_id')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      if (authData.user && data.client_id === authData.user.id) {
        toast({
          title: t("ui.nedostupno"),
          description: t("ui.nelzia_otklikatsia_na_sobstvennyi_2"),
          variant: "destructive"
        });
        navigate(`/job/${jobId}`);
        return;
      }

      setJobTitle(data.title);
      setJobClientId(data.client_id);
    } catch (error) {
      console.error('Error fetching job title:', error);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (id) {
      void fetchJobTitle(id);
    }
  }, [fetchJobTitle, id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation with detailed logging
    console.log('MobileJobRespond submission - formData:', formData);

    if (!formData.price) {
      console.error('Validation failed: empty price field');
      toast({
        title: t("notifications.error"),
        description: t("ui.pozhaluista_ukazhite_cenu"),
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.price);
    console.log('Price validation:', {
      original: formData.price,
      converted: price,
      valid: !isNaN(price) && price > 0
    });

    if (isNaN(price) || price <= 0) {
      console.error('Validation failed: invalid price number', { price: formData.price, converted: price });
      toast({
        title: t("notifications.error"),
        description: t("ui.pozhaluista_ukazhite_korrektnuiu_cenu"),
        variant: "destructive"
      });
      return;
    }

    const priceCents = Math.round(price * 100);
    console.log('Final request data:', {
      jobId: id,
      priceCents,
      etaSlot: formData.eta,
      warrantyDays: parseInt(formData.warranty),
      note: formData.notes
    });

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user && jobClientId && authData.user.id === jobClientId) {
        throw new Error('You cannot send a proposal to your own job');
      }

      const { error } = await submitJobResponse({
        jobId: id!,
        priceCents,
        etaSlot: formData.eta,
        warrantyDays: parseInt(formData.warranty, 10),
        note: formData.notes,
      });

      if (error) throw error;

      toast({
        title: t("ui.predlozhenie_otpravleno"),
        description: t("ui.vashe_predlozhenie_uspeshno_otpravleno")
      });

      navigate(`/job/${id}`);
    } catch (error: unknown) {
      console.error('Error submitting response:', error);
      const errorInfo = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

      // Enhanced error logging for better debugging
      const errorData = {
        timestamp: new Date().toISOString(),
        component: 'MobileJobRespond',
        jobId: id,
        formData: {
          price: Math.round(parseFloat(formData.price) * 100),
          eta: formData.eta,
          warranty: parseInt(formData.warranty)
        },
        error: {
          message: errorInfo.message,
          name: errorInfo.name,
          stack: errorInfo.stack
        }
      };

      console.error('Detailed mobile job response error:', errorData);

      // Special handling for role-related errors
      if (errorInfo.message.includes('Only professionals can apply to jobs')) {
        toast({
          title: t("ui.neobhodima_rol_specialista"),
          description: t("ui.chtoby_otpravliat_predlozheniia_na"),
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You cannot send a proposal to your own job')) {
        toast({
          title: t("ui.eto_vash_sobstvennyi_zakaz"),
          description: t("ui.nelzia_otklikatsia_na_sobstvennyi"),
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You need to configure your services first')) {
        toast({
          title: t("ui.snachala_nastroite_uslugi"),
          description: t("ui.dobavte_v_profile_hotia"),
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You do not offer services in')) {
        toast({
          title: t("ui.kategoriia_ne_podkliuchena"),
          description: t("ui.u_vas_ne_podkliuchena"),
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('You have already applied to this job')) {
        toast({
          title: t("ui.predlozhenie_uzhe_otpravleno"),
          description: t("ui.vy_uzhe_otpravili_predlozhenie"),
          variant: "destructive"
        });
      } else if (errorInfo.message.includes('Job not found or no longer available')) {
        toast({
          title: t("ui.zakaz_uzhe_nedostupen"),
          description: t("ui.zakaz_byl_zakryt_udalen"),
          variant: "destructive"
        });
      } else {
        toast({
          title: t("notifications.error"),
          description: errorInfo.message || t("ui.ne_udalos_otpravit_predlozhenie"),
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-neo px-4 py-3 border-b border-[#D1D5DB]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-neo neo-4 active:neo-inset-2"
          >
            <ArrowLeft className="w-5 h-5 text-[#374151]" />
          </button>
          <h1 className="text-lg font-semibold text-[#374151]">{t("dash.pro.send_offer")}</h1>
          <div className="w-9 h-9" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        {/* Job Info */}
        {jobTitle && (
          <MobileCard>
            <div className="space-y-2">
              <h3 className="font-semibold text-[#374151]">{t("dash.client.col_job")}</h3>
              <p className="text-[#6B7280]">{jobTitle}</p>
            </div>
          </MobileCard>
        )}

        {/* Price */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <Euro className="w-5 h-5 mr-2 text-green-500" />
              Ваша цена
            </h3>
            <div>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder={t("ui.vvedite_cenu_v_mdl")}
                className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                required
              />
              <p className="text-xs text-[#6B7280] mt-2">
                Укажите справедливую цену за выполнение работы
              </p>
            </div>
          </div>
        </MobileCard>

        {/* ETA */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              Время выполнения
            </h3>
            <Select value={formData.eta} onValueChange={(value) => handleInputChange('eta', value)}>
              <SelectTrigger className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4">
                <SelectValue placeholder={t("ui.vyberite_vremia_vypolneniia")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_hour">{t("ui.1_chas")}</SelectItem>
                <SelectItem value="2_hours">{t("ui.2_chasa")}</SelectItem>
                <SelectItem value="3_hours">{t("ui.3_chasa")}</SelectItem>
                <SelectItem value="same_day">{t("dash.client.urg_same_day")}</SelectItem>
                <SelectItem value="next_day">{t("ui.na_sleduiuschii_den")}</SelectItem>
                <SelectItem value="2_days">{t("ui.2_dnia")}</SelectItem>
                <SelectItem value="3_days">{t("ui.3_dnia")}</SelectItem>
                <SelectItem value="1_week">{t("ui.1_nedelia")}</SelectItem>
                <SelectItem value="2_weeks">{t("ui.2_nedeli")}</SelectItem>
                <SelectItem value="1_month">{t("ui.1_mesiac")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </MobileCard>

        {/* Warranty */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <Shield className="w-5 h-5 mr-2 text-purple-500" />
              Гарантия
            </h3>
            <div>
              <Input
                type="number"
                value={formData.warranty}
                onChange={(e) => handleInputChange('warranty', e.target.value)}
                placeholder={t("ui.kolichestvo_dnei")}
                className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-[#6B7280] mt-2">
                Количество дней гарантии на выполненную работу
              </p>
            </div>
          </div>
        </MobileCard>

        {/* Notes */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151] flex items-center">
              <FileText className="w-5 h-5 mr-2 text-orange-500" />
              Дополнительная информация
            </h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder={t("ui.opishite_kak_vy_budete")}
              rows={4}
              className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </MobileCard>

        {/* Submit Button */}
        <div className="pt-4 pb-20">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold neo-8 disabled:opacity-50"
          >
            {loading ? t("ui.otpravka") : t("dash.pro.send_offer")}
          </Button>
        </div>
      </form>
    </div>
  );
}