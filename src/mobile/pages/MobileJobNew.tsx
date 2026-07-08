import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { MobileCard } from "@/mobile/components/ui/MobileCard";
import { Camera, Clock, Euro, MapPin, Shield, Zap, Upload, CheckCircle, ArrowLeft, Loader2, Navigation, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel } from '@/lib/categoryLabel';
import { geocodeAddress, getCurrentResolvedLocation, type ResolvedLocation } from "@/lib/geolocation";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";
import { dedupeCategoriesByDisplayName } from "@/utils/categoryHelpers";

const MAX_MEDIA_FILES = 8;
const LAST_CREATED_JOB_STORAGE_KEY = "taskmatch:lastCreatedJob";

const MobileJobNew = () => {
  const { t, language } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Array<{ id: string; name: string; name_ro?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
      toast({ title: t("ui.mestopolozhenie_opredeleno"), description: location.publicLabel || t("ui.nearby_poisk_teper_budet") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("ui.ne_udalos_opredelit_mestopolozhenie");
      setLocationError(message);
      toast({ title: t("ui.oshibka_geolokacii"), description: message, variant: 'destructive' });
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
      toast({ title: t("ui.adres_podtverzhden"), description: location.publicLabel || t("ui.lokaciia_sohranena_dlia_nearby") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("ui.ne_udalos_raspoznat_adres");
      setLocationError(message);
      toast({ title: t("ui.ne_udalos_opredelit_adres"), description: message, variant: 'destructive' });
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
        description: t("ui.ukazhite_adres_ili_ispolzuite_2"),
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

      // Check if this is for a business account
      const { data: businessData } = await supabase
        .from("business_accounts")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      const scheduled_at = date && time ? new Date(`${date}T${time}:00Z`).toISOString() : null;
      const persistedLocationSource = resolvedLocation.source === 'ip_geolocate'
        ? 'address_geocode'
        : resolvedLocation.source;
      const insertPayload: any = {
        client_id: userId,
        category_id,
        title: description.substring(0, 100),
        description,
        status: 'new',
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
        const bucket = (supabase as any).storage.from('evidence');
        for (let i = 0; i < Math.min(uploadedFiles.length, 8); i++) {
          const file = uploadedFiles[i];
          try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `job/${created.id}/${Date.now()}-${i}.${ext}`;
            const { error: upErr } = await bucket.upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
            if (upErr) throw upErr;
            const { error: insErr } = await (supabase as any)
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
        await (supabase as any).functions.invoke('job-smart-match', {
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
    } catch (err: any) {
      console.error(err);
      toast({ title: t("notifications.error"), description: err?.message || t("job.new.error.create_failed"), variant: "destructive" });
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
    <div className="min-h-screen bg-neo pb-safe">
      <Seo title={`${t('app.name')} — Создать заказ`} description={t("footer.create_job")} canonical="/job/new" />

      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-neo px-4 py-3 border-b border-[#D1D5DB]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-neo neo-4 active:neo-inset-2"
          >
            <ArrowLeft className="w-5 h-5 text-[#374151]" />
          </button>
          <h1 className="text-lg font-semibold text-[#374151]">{t("job.new.title")}</h1>
          <div className="w-9 h-9" /> {/* Spacer */}
        </div>
      </div>

      <form onSubmit={onSubmit} className="px-4 py-6 space-y-6">
        {/* Service Details */}
        <MobileCard>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#374151] flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              {t("job.new.service_details")}
            </h2>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#374151]">{t("job.new.category")}</label>
              <select
                name="category_id"
                defaultValue={presetCategory}
                className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value="" disabled>{t("job.new.select_category")}</option>
                {categoryOptions}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#374151]">{t("job.new.priority")}</label>
              <select name="urgency" className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50">
                <option value="normal">{t("dash.client.urg_normal")}</option>
                <option value="urgent">{t("job.new.priority_urgent")}</option>
                <option value="same_day">{t("job.new.priority_same_day")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#374151]">{t("job.new.description")}</label>
              <textarea
                name="description"
                className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50 resize-none"
                rows={4}
                placeholder={t("job.new.description_placeholder")}
                required
              />
              <p className="text-xs text-[#6B7280] mt-2">
                {t("job.new.description_help")}
              </p>
            </div>
          </div>
        </MobileCard>

        {/* Budget Section */}
        <MobileCard>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#374151] flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              {t("job.new.budget_schedule")}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-[#374151]">
                  <Euro className="w-4 h-4 text-green-500" />
                  {t("job.new.budget_from")}
                </label>
                <input
                  name="budget_min"
                  type="number"
                  className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151]">{t("dash.pro.to")}</label>
                <input
                  name="budget_max"
                  type="number"
                  className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-[#374151]">
                  <Clock className="w-4 h-4 text-blue-500" />
                  {t("dash.client.col_date")}
                </label>
                <input
                  name="date"
                  type="date"
                  className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151]">{t("job.new.time")}</label>
                <input
                  name="time"
                  type="time"
                  className="w-full bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Location Section */}
        <MobileCard>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#374151] flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              {t("ui.geolokaciia_zakaza")}
            </h2>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#374151]">{t("ui.adres_ili_raion")}</label>
              <LocationPickerMap
                initial={resolvedLocation ? { latitude: resolvedLocation.latitude, longitude: resolvedLocation.longitude } : null}
                onSelect={(loc) => {
                  setLocationQuery(loc.address);
                  setLocationError(null);
                  applyResolvedLocation({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    address: loc.address,
                    publicLabel: loc.address,
                    source: 'map',
                    precision: 'exact',
                  } as ResolvedLocation);
                }}
                className="mb-3"
              />
              <div className="flex gap-2">
                <input
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    setLocationError(null);
                  }}
                  placeholder={t("ui.kishinev_raion_ulica")}
                  className="flex-1 bg-neo border-none rounded-xl px-4 py-3 text-[#374151] neo-inset-4 focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={handleResolveAddress}
                  disabled={locationLoading || !locationQuery.trim()}
                  className="px-3 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-60 inline-flex items-center gap-1"
                >
                  {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="w-full px-4 py-3 bg-neo text-[#374151] rounded-xl font-semibold neo-8 active:neo-inset-4 inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 text-primary" />}
                {t("ui.ispolzovat_moe_mestopolozhenie")}
              </button>

              {resolvedLocation ? (
                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 space-y-1">
                  <div className="flex items-center gap-2 font-medium"><CheckCircle className="w-4 h-4" /> Локация готова</div>
                  <div>{resolvedLocation.publicLabel || resolvedLocation.address}</div>
                  <div className="text-xs text-green-800/80">{resolvedLocation.latitude.toFixed(5)}, {resolvedLocation.longitude.toFixed(5)}</div>
                  <div className="text-xs text-green-800/80">
                    Источник: {resolvedLocation.source === 'device_gps' ? t("ui.geolokaciia_ustroistva") : resolvedLocation.source === 'ip_geolocate' ? t("ui.primernaia_lokaciia_po_ip") : t("ui.ruchnoi_adres")}
                  </div>
                  {resolvedLocation.source === 'ip_geolocate' && (
                    <div className="text-xs text-amber-700">{t("ui.tochnost_priblizitelnaia_luchshe_utochni")}</div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-[#6B7280]">
                  {t("ui.bez_geolokacii_platforma_ne")}
                </div>
              )}

              {locationError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{locationError}</div>}
            </div>
          </div>
        </MobileCard>

        {/* Photos Section */}
        <MobileCard>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#374151] flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              {t("job.new.photos")}
            </h2>

            {/* Quick Camera Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => openMediaPicker('image/*', 'environment')}
                disabled={mediaLimitReached}
                className="flex flex-col items-center justify-center p-2 bg-neo rounded-lg neo-4 active:neo-inset-2 transition-all disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-primary mb-1" />
                <span className="text-xs text-[#374151] font-medium">{t("ui.kamera")}</span>
              </button>

              <button
                type="button"
                onClick={() => openMediaPicker('video/*', 'environment')}
                disabled={mediaLimitReached}
                className="flex flex-col items-center justify-center p-2 bg-neo rounded-lg neo-4 active:neo-inset-2 transition-all disabled:opacity-50"
              >
                <div className="w-4 h-4 text-primary mb-1 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </div>
                <span className="text-xs text-[#374151] font-medium">{t("ui.video")}</span>
              </button>

              <label htmlFor="mobile-photo-upload" className={`flex flex-col items-center justify-center p-2 bg-primary text-white rounded-lg neo-4 transition-all ${mediaLimitReached ? 'opacity-50 pointer-events-none' : 'cursor-pointer active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)]'}`}>
                <Upload className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">{t("ui.faily")}</span>
              </label>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-3 text-center transition-all ${
                dragActive ? 'border-primary bg-primary/5' : 'border-[#D1D5DB]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-[#6B7280] mb-2">
                Или выберите до {MAX_MEDIA_FILES} фото/видео из галереи
              </p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileInput}
                className="hidden"
                id="mobile-photo-upload"
                name="photos"
              />
              <label htmlFor="mobile-photo-upload" className={`bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold neo-2 inline-flex items-center gap-1 ${mediaLimitReached ? 'opacity-50 pointer-events-none' : 'cursor-pointer active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]'}`}>
                <Upload className="w-3 h-3" />
                {t("hero.mock.select")}
              </label>
              <p className="mt-2 text-[11px] text-[#6B7280]">
                Осталось мест: {remainingSlots}/{MAX_MEDIA_FILES}
              </p>
            </div>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[#6B7280]">Загружено: {uploadedFiles.length}/{MAX_MEDIA_FILES}</p>
                <div className="grid grid-cols-4 gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="relative group bg-neo rounded-lg p-1 neo-2">
                      {file.type.startsWith('video/') ? (
                        <div className="w-full h-12 bg-[#D1D5DB] rounded flex items-center justify-center relative">
                          <svg className="w-4 h-4 text-[#6B7280]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                          </svg>
                          <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded">
                            {(file.size / 1024 / 1024).toFixed(1)}MB
                          </span>
                        </div>
                      ) : (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-12 object-cover rounded"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-[1px_1px_2px_rgba(0,0,0,0.2)]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </MobileCard>

        {/* Submit Button */}
        <div className="flex justify-between items-center pt-4 pb-20">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-neo text-[#374151] rounded-xl font-semibold neo-8 active:neo-inset-4"
          >
            {t("common.cancel")}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold neo-8 disabled:opacity-50"
          >
            {loading ? t("job.new.creating") : t("job.new.create")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MobileJobNew;