import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, Gavel, AlertTriangle, ArrowLeft, DollarSign, Calendar } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { RoleGuard } from "@/components/RoleGuard";
import tenderImage from "@/assets/tenders-auction.jpg";
import { supabase } from "@/integrations/supabase/client";
import { dedupeCategoriesByDisplayName } from "@/utils/categoryHelpers";

const TenderNew = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const [categories, setCategories] = useState<Array<{ id: string; name: string; name_ro?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [businessAccount, setBusinessAccount] = useState<any>(null);
  const [businessAccountLoading, setBusinessAccountLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id,key,label_ru,label_ro")
          .order("label_ru");
        if (error) throw error;
        const mappedData = data?.map(cat => ({
          id: cat.id,
          name: cat.label_ru || cat.key,
          name_ro: cat.label_ro
        })) || [];
        setCategories(dedupeCategoriesByDisplayName(mappedData));
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Load business account on component mount
  useEffect(() => {
    const loadBusinessAccount = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();

        if (!session.session?.user) {
          navigate('/auth');
          return;
        }

        // Check if user has business account
        const { data: businessData, error } = await supabase
          .from('business_accounts')
          .select('*')
          .eq('owner_id', session.session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking business account:', error);
          toast({
            title: t("notifications.error"),
            description: t("ui.ne_udalos_proverit_biznes"),
            variant: 'destructive'
          });
          return;
        }

        setBusinessAccount(businessData);
      } catch (error: any) {
        console.error('Error loading business account:', error);
        toast({
          title: t("notifications.error"),
          description: t("ui.ne_udalos_zagruzit_biznes"),
          variant: 'destructive'
        });
      } finally {
        setBusinessAccountLoading(false);
      }
    };

    loadBusinessAccount();
  }, [navigate, toast]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category_id = String(fd.get("category_id") || "");
    const title = String(fd.get("title") || "");
    const description = String(fd.get("description") || "");
    const budget_max = Number(fd.get("budget_max") || 0);
    const date = String(fd.get("date") || "");
    const time = String(fd.get("time") || "");

    if (!title.trim()) {
      toast({ title: t("notifications.error"), description: t("ui.vvedite_nazvanie_tendera"), variant: 'destructive' });
      return;
    }

    if (!description.trim()) {
      toast({ title: t("notifications.error"), description: t("ui.vvedite_opisanie_tendera"), variant: 'destructive' });
      return;
    }

    if (!budget_max) {
      toast({ title: t("notifications.error"), description: t("ui.ukazhite_maksimalnyi_biudzhet"), variant: 'destructive' });
      return;
    }

    if (!date || !time) {
      toast({ title: t("notifications.error"), description: t("ui.ukazhite_srok_podachi_zaiavok"), variant: 'destructive' });
      return;
    }

    if (!businessAccount) {
      toast({
        title: t("notifications.error"),
        description: t("ui.u_vas_net_biznes"),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const userId = s.session?.user?.id;
      if (!userId) {
        toast({ title: t("messages.login_required"), description: t("messages.please_login") , variant: "destructive"});
        navigate("/auth");
        return;
      }

      const deadline = new Date(`${date}T${time}:00Z`).toISOString();

      const { data: created, error } = await supabase
        .from('tenders')
        .insert({
          client_id: userId,
          business_id: businessAccount.id,
          title: title,
          description: description,
          budget_max_cents: Math.round(budget_max * 100), // Convert to cents
          deadline: deadline,
          category_id: category_id || null,
          status: 'open'
        })
        .select('id')
        .single();

      if (error) throw error;

      let uploadedPhotos = 0;
      let failedPhotos = 0;

      // Upload photos to private bucket and link to tender (similar to jobs)
      if (created?.id && uploadedFiles.length) {
        const bucket = (supabase as any).storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `tender/${created.id}/${Date.now()}-${i}.${ext}`;
            const { error: upErr } = await bucket.upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
            if (upErr) throw upErr;
            uploadedPhotos += 1;
            // You may want to create a tender_photos table similar to job_photos
          } catch (e) {
            failedPhotos += 1;
            console.warn('photo upload failed', e);
          }
        }
      }

      toast({
        title: failedPhotos > 0 ? t("ui.tender_sozdan_chastichno") : t("ui.uspeh"),
        description: failedPhotos > 0
          ? `Тендер создан, но ${failedPhotos} из ${uploadedFiles.length} фото не загрузил${failedPhotos === 1 ? 'ось' : failedPhotos < 5 ? 'ись' : 'ось'}. Проверьте вложения на странице тендера.`
          : uploadedPhotos > 0
            ? `Тендер создан успешно. Загружено фото: ${uploadedPhotos}. Исполнители смогут откликаться до указанного срока.`
            : t("ui.tender_sozdan_uspeshno_ispolniteli")
      });
      navigate(`/tenders/${created.id}`, { replace: true });
    } catch (err: any) {
      console.error(err);
      toast({ title: t("notifications.error"), description: err?.message || t("ui.ne_udalos_sozdat_tender"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = useMemo(() => categories.map(c => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  )), [categories]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files.slice(0, 8 - prev.length)]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files.slice(0, 8 - prev.length)]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (businessAccountLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neo">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("common.loading")}</h2>
          <p className="text-muted-foreground">{t("ui.proveriaem_vash_biznes_akkaunt")}</p>
        </div>
      </main>
    );
  }

  return (
    <RoleGuard requiredRole="business">
      <main className="min-h-screen bg-neo">
        <Seo title={`${t('app.name')} — Создать тендер`} description={t("ui.sozdaite_tender_dlia_polucheniia")} canonical="/tenders/new" />

        {/* Hero Section */}
        <section className="container mx-auto pt-6 md:pt-10 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-display font-bold">{t("biz.tenders.create")}</h1>
            <p className="text-muted-foreground mt-1">{t("ui.poluchite_otkliki_ot_ispolnitelei")}</p>
          </div>
        </section>

        {!businessAccount && (
          <section className="container mx-auto px-6 pt-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 p-6 rounded-2xl bg-neo neo-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-neo neo-4 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{t("ui.trebuetsia_biznes_akkaunt")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("ui.dlia_sozdaniia_tenderov_neobhodim")}
                    </p>
                    <button
                      onClick={() => navigate('/dashboard/business')}
                      className="bg-neo neo-4 hover:neo-inset-2 border-0 px-6 py-3 rounded-xl font-semibold transition-all"
                    >
                      {t("dashboard.business.create_btn")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Form Section */}
        <section className="container mx-auto py-16 px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 text-[#4B5563]">
              {t("ui.detali_tendera")}
            </h2>
            <p className="text-xl text-[#6B7280] max-w-2xl mx-auto">
              {t("ui.opishite_proekt_podrobno_dlia")}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Navigation */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => navigate('/dashboard/business?tab=tenders')}
                className="gap-2 bg-neo neo-4 hover:neo-inset-2 border-0 px-6 py-3 rounded-xl font-semibold transition-all flex items-center"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("ui.nazad_k_tenderam")}
              </button>
            </div>

            <div className="bg-neo rounded-3xl p-8 neo-12">
              <form className="space-y-8" onSubmit={onSubmit}>

                {businessAccount && (
                  <div className="p-4 rounded-xl bg-neo neo-inset-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>{t("ui.biznes_akkaunt")}</strong> {businessAccount.company_name}
                    </p>
                  </div>
                )}

                {/* Tender Details */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                    <span className="w-8 h-8 bg-neo rounded-full flex items-center justify-center text-primary font-bold neo-4">1</span>
                    {t("ui.informaciia_o_tendere")}
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-neo rounded-2xl p-6 neo-8">
                      <label className="block text-sm font-medium mb-3 text-[#374151]">{t("ui.kategoriia_uslugi")}</label>
                      <select
                        name="category_id"
                        className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                      >
                        <option value="">{t("job.new.select_category")}</option>
                        {categoryOptions}
                      </select>
                    </div>

                    <div className="bg-neo rounded-2xl p-6 neo-8">
                      <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-[#374151]">
                        <Euro className="w-4 h-4 text-green-500" />
                        {t("ui.maksimalnyi_biudzhet_2")}
                      </label>
                      <input
                        name="budget_max"
                        type="number"
                        min="1"
                        className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                        placeholder="5000"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <label className="block text-sm font-medium mb-3 text-[#374151]">{t("ui.nazvanie_tendera")}</label>
                    <input
                      name="title"
                      className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                      placeholder={t("ui.naprimer_remont_ofisnogo_pomescheniia")}
                      maxLength={200}
                      required
                    />
                  </div>

                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <label className="block text-sm font-medium mb-3 text-[#374151]">{t("ui.opisanie_proekta")}</label>
                    <textarea
                      name="description"
                      className="w-full bg-neo border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                      rows={4}
                      placeholder={t("ui.podrobno_opishite_proekt_trebovaniia")}
                      maxLength={1000}
                      required
                    />
                    <p className="text-xs text-[#6B7280] mt-2">
                      {t("ui.podrobnoe_opisanie_pomozhet_ispolnitelia")}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="space-y-6 pt-8 border-t border-[#D1D5DB]">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                    <span className="w-8 h-8 bg-neo rounded-full flex items-center justify-center text-primary font-bold neo-4">2</span>
                    {t("ui.srok_podachi_zaiavok")}
                  </h2>

                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-[#374151]">
                          <Clock className="w-4 h-4 text-blue-500" />
                          {t("ui.data_okonchaniia")}
                        </label>
                        <input
                          name="date"
                          type="date"
                          className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3 text-[#374151]">{t("ui.vremia")}</label>
                        <input
                          name="time"
                          type="time"
                          className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2">
                      {t("ui.posle_etogo_vremeni_podacha")}
                    </p>
                  </div>
                </div>

                {/* Photos */}
                <div className="space-y-6 pt-8 border-t border-[#D1D5DB]">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                    <span className="w-8 h-8 bg-neo rounded-full flex items-center justify-center text-primary font-bold neo-4">3</span>
                    {t("ui.dopolnitelnye_materialy")}
                  </h2>

                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive ? 'border-primary bg-primary/5' : 'border-[#D1D5DB]'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <AnimatedIcon icon={Camera} className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2 text-[#374151]">{t("ui.dobavte_fotografii_ili_dokumenty")}</h3>
                      <p className="text-[#6B7280] mb-4">
                        {t("ui.peretaschite_faily_siuda_ili")}
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                        name="files"
                      />
                      <label htmlFor="file-upload" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors neo-8 inline-flex items-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        {t("job.new.select_files")}
                      </label>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="relative group bg-neo rounded-xl p-2 neo-4">
                            {file.type.startsWith('image/') ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center bg-gray-100 rounded-lg">
                                <span className="text-xs text-gray-600">{file.name}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity neo-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-between items-center pt-8 border-t border-[#D1D5DB]">
                  <button type="button" className="bg-neo text-[#374151] hover:bg-[#D1D5DB] px-8 py-4 rounded-xl font-semibold text-lg transition-colors neo-8 hover:neo-inset-4" onClick={() => navigate('/dashboard/business?tab=tenders')}>
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors neo-8" disabled={loading || !businessAccount}>
                    {loading ? t("ui.sozdaem_tender") : t("biz.tenders.create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </RoleGuard>
  );
};

export default TenderNew;