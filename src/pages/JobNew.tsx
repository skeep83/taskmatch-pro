import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassMorphism } from "@/components/ui/glass-morphism";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, Loader2, Navigation, Search } from "lucide-react";
import jobImage from "@/assets/services-hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel } from '@/lib/categoryLabel';
import { geocodeAddress, getCurrentResolvedLocation, type ResolvedLocation } from "@/lib/geolocation";
import { dedupeCategoriesByDisplayName } from "@/utils/categoryHelpers";

const MAX_MEDIA_FILES = 8;
const LAST_CREATED_JOB_STORAGE_KEY = "taskmatch:lastCreatedJob";

const JobNew = () => {
  const { t, language } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Array<{ id: string; name: string; name_ro?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const [locationQuery, setLocationQuery] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

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
          name: categoryLabel(cat, language) || cat.key,
          name_ro: cat.label_ro
        })) || [];
        setCategories(dedupeCategoriesByDisplayName(mappedData));
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const presetCategory = params.get("category_id") || "";
  const presetProId = params.get("pro_id") || "";

  const applyResolvedLocation = (location: ResolvedLocation) => {
    setResolvedLocation(location);
    setLocationQuery(location.address);
    setLocationError(null);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const location = await getCurrentResolvedLocation();
      applyResolvedLocation(location);
      toast({
        title: t("ui.mestopolozhenie_opredeleno"),
        description: location.publicLabel || t("ui.budem_iskat_specialistov_riadom"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("ui.ne_udalos_opredelit_mestopolozhenie");
      setLocationError(message);
      toast({ title: t("ui.oshibka_geolokacii"), description: message, variant: "destructive" });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleResolveAddress = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const location = await geocodeAddress(locationQuery);
      applyResolvedLocation(location);
      toast({
        title: t("ui.adres_podtverzhden"),
        description: location.publicLabel || t("ui.lokaciia_gotova_dlia_poiska"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("ui.ne_udalos_raspoznat_adres");
      setLocationError(message);
      toast({ title: t("ui.ne_udalos_opredelit_adres"), description: message, variant: "destructive" });
    } finally {
      setLocationLoading(false);
    }
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category_id = String(fd.get("category_id") || "");
    const description = String(fd.get("description") || "");
    const urgency = String(fd.get("urgency") || "normal");
    const budget_min = Number(fd.get("budget_min") || 0);
    const budget_max = Number(fd.get("budget_max") || 0);
    const date = String(fd.get("date") || "");
    const time = String(fd.get("time") || "");

    if (!category_id || !description) {
      toast({ title: t("auth.error.fields"), description: t("job.new.error.required"), variant: "destructive" });
      return;
    }

    if (!resolvedLocation) {
      toast({
        title: t("ui.nuzhna_geolokaciia"),
        description: t("ui.ukazhite_adres_ili_ispolzuite"),
        variant: "destructive"
      });
      return;
    }

    if ((budget_min > 0 || budget_max > 0) && budget_max > 0 && budget_min > budget_max) {
      toast({
        title: t("ui.proverte_biudzhet"),
        description: t("ui.maksimalnyi_biudzhet_ne_mozhet"),
        variant: "destructive"
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

      // Check if this is for a business account
      const { data: businessData } = await supabase
        .from("business_accounts")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      const scheduled_at = date && time ? new Date(`${date}T${time}:00Z`).toISOString() : null;
      const trimmedDescription = description.trim();
      const persistedLocationSource = resolvedLocation.source === 'ip_geolocate'
        ? 'address_geocode'
        : resolvedLocation.source;
      const insertPayload: {
        client_id: string;
        category_id: string;
        title: string;
        description: string;
        status: "new";
        budget_min_cents: number | null;
        budget_max_cents: number | null;
        scheduled_at: string | null;
        urgency: string;
        location_lat: number;
        location_lng: number;
        location_address: string;
        location_precision?: string | null;
        location_source?: string | null;
        location_public_label?: string | null;
        pro_id?: string;
      } = {
        client_id: userId,
        category_id,
        title: trimmedDescription.substring(0, 100),
        description: trimmedDescription,
        status: "new",
        budget_min_cents: isFinite(budget_min) ? Math.round(budget_min * 100) : null,
        budget_max_cents: isFinite(budget_max) ? Math.round(budget_max * 100) : null,
        scheduled_at,
        urgency,
        location_lat: resolvedLocation.latitude,
        location_lng: resolvedLocation.longitude,
        location_address: resolvedLocation.address,
        location_precision: resolvedLocation.precision,
        location_source: persistedLocationSource,
        location_public_label: resolvedLocation.publicLabel,
      };

      if (presetProId) insertPayload.pro_id = presetProId;

      const { data: created, error } = await supabase
        .from("jobs")
        .insert(insertPayload)
        .select(`
          id,
          public_id,
          client_id,
          title,
          status,
          budget_min_cents,
          budget_max_cents,
          created_at,
          scheduled_at,
          urgency
        `)
        .single();
      if (error) throw error;

      // Link to business if this is a business user
      if (businessData?.id && created?.id) {
        await supabase
          .from("business_jobs")
          .insert({
            business_id: businessData.id,
            job_id: created.id
          });
      }

      // Upload photos to private bucket and link to job
      if (created?.id && uploadedFiles.length) {
        const bucket = supabase.storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `job/${created.id}/${Date.now()}-${i}.${ext}`;
            const { error: upErr } = await bucket.upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
            if (upErr) throw upErr;
            const { error: insErr } = await supabase
              .from('job_photos')
              .insert({ job_id: created.id, file_url: path });
            if (insErr) throw insErr;
          } catch (e) {
            console.warn('photo upload failed', e);
          }
        }
      }

      // Trigger smart matching to find nearby professionals
      try {
        await supabase.functions.invoke('job-smart-match', {
          body: { jobId: created.id }
        });
      } catch (matchError) {
        console.warn('Smart matching failed:', matchError);
        // Continue even if matching fails
      }

      try {
        window.sessionStorage.setItem(LAST_CREATED_JOB_STORAGE_KEY, JSON.stringify(created));
      } catch (storageError) {
        console.warn('Failed to persist just-created job locally:', storageError);
      }

      toast({ title: t("job.new.success.created"), description: t("job.new.success.specialists_notified") });
      navigate("/dashboard/client?tab=jobs&refresh=1", { replace: true });
    } catch (err) {
      console.error(err);
      toast({
        title: t("notifications.error"),
        description: err instanceof Error ? err.message : t("job.new.error.create_failed"),
        variant: "destructive"
      });
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
    addFiles(Array.from(e.dataTransfer.files));
  };

  const addFiles = (incomingFiles: File[]) => {
    if (!incomingFiles.length) return;

    let skippedCount = 0;

    setUploadedFiles(prev => {
      const availableSlots = Math.max(0, MAX_MEDIA_FILES - prev.length);
      const filesToAdd = incomingFiles.slice(0, availableSlots);
      skippedCount = incomingFiles.length - filesToAdd.length;
      return [...prev, ...filesToAdd];
    });

    if (skippedCount > 0) {
      toast({
        title: t("ui.limit_failov_dostignut"),
        description: `Можно прикрепить не более ${MAX_MEDIA_FILES} фото/видео к одному заказу.`,
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const openMediaPicker = (accept: string, capture?: 'environment') => {
    if (uploadedFiles.length >= MAX_MEDIA_FILES) {
      toast({
        title: t("ui.limit_failov_dostignut"),
        description: `Удалите лишние вложения, чтобы добавить новые. Максимум: ${MAX_MEDIA_FILES}.`,
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    if (capture) {
      input.capture = capture;
    }
    input.onchange = (event) => {
      addFiles(Array.from((event.target as HTMLInputElement).files || []));
      input.value = '';
    };
    input.click();
  };

  const remainingSlots = Math.max(0, MAX_MEDIA_FILES - uploadedFiles.length);
  const mediaLimitReached = remainingSlots === 0;

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen bg-neo">
      <Seo title={`${t('app.name')} — ${t('job.new.title')}`} description={t("job.new.subtitle")} canonical="/job/new" />

      {/* Form Section */}
      <section className="container mx-auto py-6 md:py-10 px-4 md:px-6">
        <div className="max-w-7xl mx-auto mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            {t("job.new.title")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("job.new.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-neo rounded-3xl p-8 neo-12">
            <form className="space-y-8" onSubmit={onSubmit}>

              {/* Service Details */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                  <span className="w-8 h-8 bg-neo rounded-full flex items-center justify-center text-primary font-bold neo-4">1</span>
                  {t("job.new.service_details")}
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <label className="block text-sm font-medium mb-3 text-[#374151]">{t("job.new.category")}</label>
                    <select
                      name="category_id"
                      defaultValue={presetCategory}
                      className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                      required
                    >
                      <option value="" disabled>{t("job.new.select_category")}</option>
                      {categoryOptions}
                    </select>
                  </div>

                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <label className="block text-sm font-medium mb-3 text-[#374151]">{t("job.new.priority")}</label>
                    <select name="urgency" className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]">
                      <option value="normal">{t("dash.client.urg_normal")}</option>
                      <option value="urgent">{t("job.new.priority_urgent")}</option>
                      <option value="same_day">{t("job.new.priority_same_day")}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-neo rounded-2xl p-6 neo-8">
                  <label className="block text-sm font-medium mb-3 text-[#374151]">{t("job.new.description")}</label>
                  <textarea
                    name="description"
                    className="w-full bg-neo border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                    rows={4}
                    placeholder={t("job.new.description_placeholder")}
                    required
                  />
                  <p className="text-xs text-[#6B7280] mt-2">
                    {t("job.new.description_help")}
                  </p>
                </div>
              </div>

              {/* Budget & Schedule */}
              <div className="space-y-6 pt-8 border-t border-[#D1D5DB]">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                  <span className="w-8 h-8 bg-neo rounded-full flex items-center justify-center text-primary font-bold neo-4">2</span>
                  {t("job.new.budget_schedule")}
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-[#374151]">
                          <Euro className="w-4 h-4 text-green-500" />
                          {t("job.new.budget_from")}
                        </label>
                        <input
                          name="budget_min"
                          type="number"
                          className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                          placeholder="1000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3 text-[#374151]">{t("dash.pro.to")}</label>
                        <input
                          name="budget_max"
                          type="number"
                          className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-neo rounded-2xl p-6 neo-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-[#374151]">
                          <Clock className="w-4 h-4 text-blue-500" />
                          {t("dash.client.col_date")}
                        </label>
                        <input
                          name="date"
                          type="date"
                          className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3 text-[#374151]">{t("job.new.time")}</label>
                        <input
                          name="time"
                          type="time"
                          className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-6 pt-8 border-t border-[#D1D5DB]">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                  <span className="w-8 h-8 bg-neo rounded-full flex items-center justify-center text-primary font-bold neo-4">3</span>
                  {t("ui.geolokaciia_zakaza")}
                </h2>

                <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
                  <div className="bg-neo rounded-2xl p-6 neo-8 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-3 text-[#374151]">{t("ui.adres_ili_raion")}</label>
                      <div className="flex gap-3">
                        <input
                          value={locationQuery}
                          onChange={(e) => {
                            setLocationQuery(e.target.value);
                            setLocationError(null);
                          }}
                          placeholder={t("ui.naprimer_kishinev_buiukany_ul")}
                          className="w-full bg-neo border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all neo-inset-4 text-[#374151]"
                        />
                        <button
                          type="button"
                          onClick={handleResolveAddress}
                          disabled={locationLoading || !locationQuery.trim()}
                          className="shrink-0 bg-primary text-white hover:bg-primary/90 px-5 py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                        >
                          {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          {t("ui.utochnit")}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locationLoading}
                      className="w-full bg-neo text-[#374151] hover:bg-[#DDE1E7] px-5 py-4 rounded-xl font-semibold transition-colors neo-8 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 text-primary" />}
                      {t("ui.ispolzovat_moe_mestopolozhenie")}
                    </button>

                    <p className="text-sm text-[#6B7280]">
                      {t("ui.my_ispolzuem_lokaciiu_chtoby")}
                    </p>
                  </div>

                  <div className="bg-neo rounded-2xl p-6 neo-8 space-y-3">
                    <div className="flex items-center gap-2 text-[#374151] font-semibold">
                      <MapPin className="w-5 h-5 text-primary" />
                      {t("ui.status_geolokacii")}
                    </div>

                    {resolvedLocation ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3">
                          <CheckCircle className="w-5 h-5 mt-0.5" />
                          <div>
                            <div className="font-medium">{t("ui.lokaciia_gotova")}</div>
                            <div className="text-sm">{resolvedLocation.publicLabel || resolvedLocation.address}</div>
                          </div>
                        </div>
                        <div className="text-sm text-[#6B7280] space-y-1">
                          <div><span className="font-medium text-[#374151]">{t("ui.adres_2")}</span> {resolvedLocation.address}</div>
                          <div><span className="font-medium text-[#374151]">{t("ui.koordinaty")}</span> {resolvedLocation.latitude.toFixed(5)}, {resolvedLocation.longitude.toFixed(5)}</div>
                          <div><span className="font-medium text-[#374151]">{t("ui.istochnik")}</span> {resolvedLocation.source === 'device_gps' ? t("ui.geolokaciia_ustroistva") : resolvedLocation.source === 'ip_geolocate' ? t("ui.primernaia_lokaciia_po_ip") : t("ui.ruchnoi_adres")}</div>
                          {resolvedLocation.source === 'ip_geolocate' && (
                            <div className="text-amber-700">{t("ui.tochnost_priblizitelnaia_ispolzuite_http")}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-[#6B7280] bg-amber-50 rounded-xl px-4 py-3">
                        {t("ui.do_publikacii_zakaza_ukazhite")}
                      </div>
                    )}

                    {locationError && (
                      <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{locationError}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-6 pt-8 border-t border-[#D1D5DB]">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-[#374151]">
                  <span className="w-8 h-8 bg-neo rounded-full flex items-center justify-center text-primary font-bold neo-4">4</span>
                  {t("job.new.photos")}
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
                    <h3 className="text-lg font-medium mb-2 text-[#374151]">{t("job.new.photos")}</h3>
                    <p className="text-[#6B7280] mb-4">
                      Перетащите до {MAX_MEDIA_FILES} фото/видео сюда или выберите файлы
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="media-upload"
                      name="media"
                    />
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => openMediaPicker('image/*')}
                        disabled={mediaLimitReached}
                        className="bg-neo text-[#374151] hover:bg-[#DDE1E7] px-5 py-3 rounded-xl font-semibold transition-colors neo-8 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Camera className="w-4 h-4 text-primary" />
                        {t("ui.foto")}
                      </button>
                      <button
                        type="button"
                        onClick={() => openMediaPicker('video/*')}
                        disabled={mediaLimitReached}
                        className="bg-neo text-[#374151] hover:bg-[#DDE1E7] px-5 py-3 rounded-xl font-semibold transition-colors neo-8 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4 text-primary" />
                        {t("ui.video")}
                      </button>
                      <label htmlFor="media-upload" className={`bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors neo-8 inline-flex items-center gap-2 ${mediaLimitReached ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}>
                        <Upload className="w-4 h-4" />
                        {t("ui.vybrat_liubye_faily")}
                      </label>
                    </div>
                    <p className="mt-4 text-sm text-[#6B7280]">
                      Осталось мест: {remainingSlots}/{MAX_MEDIA_FILES}
                    </p>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-sm text-[#6B7280]">Загружено: {uploadedFiles.length}/{MAX_MEDIA_FILES}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group bg-neo rounded-xl p-2 neo-4">
                          {file.type.startsWith('video/') ? (
                            <div className="w-full h-20 bg-[#D1D5DB] rounded-lg flex items-center justify-center relative">
                              <svg className="w-8 h-8 text-[#6B7280]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                              </svg>
                              <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                {(file.size / 1024 / 1024).toFixed(1)}MB
                              </span>
                            </div>
                          ) : (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
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
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-between items-center pt-8 border-t border-[#D1D5DB]">
                <button type="button" className="bg-neo text-[#374151] hover:bg-[#D1D5DB] px-8 py-4 rounded-xl font-semibold text-lg transition-colors neo-8 hover:neo-inset-4" onClick={() => navigate(-1)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-xl font-semibold text-lg transition-colors neo-8" disabled={loading}>
                  {loading ? t("job.new.creating") : t("footer.create_job")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

export default JobNew;
