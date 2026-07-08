import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { LocateFixed, Users, Briefcase, ArrowRight, Loader2 } from "lucide-react";

const CHISINAU = { lat: 47.0105, lng: 28.8638 };
const RADIUS_KM = 7;

const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

/** ~300m random offset so nobody's exact position leaks onto the landing map */
const jitter = (v: number) => v + (Math.random() - 0.5) * 0.006;

const CountUp = ({ value }: { value: number }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (value <= 0) { setN(0); return; }
    let cur = 0;
    const step = Math.max(1, Math.ceil(value / 30));
    const timer = window.setInterval(() => {
      cur = Math.min(value, cur + step);
      setN(cur);
      if (cur >= value) window.clearInterval(timer);
    }, 30);
    return () => window.clearInterval(timer);
  }, [value]);
  return <>{n}</>;
};

/**
 * Landing geo feature: one tap shows the live marketplace around the
 * visitor — anonymised specialist/job markers within ~7 km and animated
 * counters. Positions are jittered; falls back to Chișinău without
 * permission. Hidden entirely when Maps is unavailable.
 */
export const NearbyLive = () => {
  const { t } = useEnhancedI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [phase, setPhase] = useState<"idle" | "locating" | "ready" | "unavailable">("idle");
  const [prosCount, setProsCount] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);

  const activate = () => {
    setPhase("locating");
    const go = (lat: number, lng: number, fallback: boolean) => void build(lat, lng, fallback);
    if (!navigator.geolocation) { go(CHISINAU.lat, CHISINAU.lng, true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => go(pos.coords.latitude, pos.coords.longitude, false),
      () => go(CHISINAU.lat, CHISINAU.lng, true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  const build = async (lat: number, lng: number, fallback: boolean) => {
    const g = await loadGoogleMaps();
    if (!g || !containerRef.current) { setPhase("unavailable"); return; }
    setUsedFallback(fallback);

    // rough bounding box, refined with haversine
    const dLat = RADIUS_KM / 111;
    const dLng = RADIUS_KM / (111 * Math.cos((lat * Math.PI) / 180));
    const [{ data: pros }, { data: jobs }] = await Promise.all([
      supabase.from("profiles").select("latitude, longitude")
        .gte("latitude", lat - dLat).lte("latitude", lat + dLat)
        .gte("longitude", lng - dLng).lte("longitude", lng + dLng)
        .limit(300),
      supabase.from("jobs").select("location_lat, location_lng")
        .eq("status", "new")
        .gte("location_lat", lat - dLat).lte("location_lat", lat + dLat)
        .gte("location_lng", lng - dLng).lte("location_lng", lng + dLng)
        .limit(300),
    ]);

    const proPts = (pros || [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .filter((p) => haversineKm(lat, lng, Number(p.latitude), Number(p.longitude)) <= RADIUS_KM);
    const jobPts = (jobs || [])
      .filter((j) => j.location_lat != null && j.location_lng != null)
      .filter((j) => haversineKm(lat, lng, Number(j.location_lat), Number(j.location_lng)) <= RADIUS_KM);

    const map = new g.maps.Map(containerRef.current, {
      center: { lat, lng },
      zoom: 12,
      disableDefaultUI: true,
      gestureHandling: "cooperative",
      clickableIcons: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
      ],
    });
    mapRef.current = map;

    // visitor radius
    new g.maps.Circle({
      map, center: { lat, lng }, radius: RADIUS_KM * 1000,
      strokeColor: "#2563eb", strokeOpacity: 0.25, strokeWeight: 1.5,
      fillColor: "#2563eb", fillOpacity: 0.05,
    });
    // anonymised dots
    proPts.slice(0, 120).forEach((p) => new g.maps.Marker({
      map,
      position: { lat: jitter(Number(p.latitude)), lng: jitter(Number(p.longitude)) },
      icon: { path: g.maps.SymbolPath.CIRCLE, scale: 6, fillColor: "#2563eb", fillOpacity: 0.85, strokeColor: "#ffffff", strokeWeight: 1.5 },
      clickable: false,
    }));
    jobPts.slice(0, 120).forEach((j) => new g.maps.Marker({
      map,
      position: { lat: jitter(Number(j.location_lat)), lng: jitter(Number(j.location_lng)) },
      icon: { path: g.maps.SymbolPath.CIRCLE, scale: 6, fillColor: "#f59e0b", fillOpacity: 0.85, strokeColor: "#ffffff", strokeWeight: 1.5 },
      clickable: false,
    }));

    setProsCount(proPts.length);
    setJobsCount(jobPts.length);
    setPhase("ready");
  };

  if (phase === "unavailable") return null;

  return (
    <section className="container mx-auto py-24 px-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("nearby.title")}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">{t("nearby.subtitle")}</p>
      </div>

      <div className="max-w-4xl mx-auto neo-card neo-aura p-3 md:p-4">
        {phase !== "ready" ? (
          <div className="h-72 md:h-96 rounded-2xl bg-neo neo-inset-2 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="neo-icon-well w-14 h-14">
              <LocateFixed className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">{t("nearby.cta_hint")}</p>
            <button
              type="button"
              onClick={activate}
              disabled={phase === "locating"}
              className="neo-btn-primary btn-sheen px-6 py-3 rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {phase === "locating" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              {t("nearby.cta_btn")}
            </button>
          </div>
        ) : (
          <>
            <div className="relative rounded-2xl overflow-hidden">
              <div ref={containerRef} className="w-full h-72 md:h-96" />
              <div className="absolute left-3 bottom-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-3 py-1.5 text-xs font-semibold text-gray-800 shadow">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                  <Users className="w-3.5 h-3.5" />
                  <CountUp value={prosCount} /> {t("nearby.pros")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-3 py-1.5 text-xs font-semibold text-gray-800 shadow">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <Briefcase className="w-3.5 h-3.5" />
                  <CountUp value={jobsCount} /> {t("nearby.jobs")}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-3 pb-1">
              <p className="text-xs text-muted-foreground">
                {usedFallback ? t("nearby.fallback_note") : t("nearby.privacy_note")}
              </p>
              <div className="flex gap-2">
                <Link to="/job/new" className="neo-btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5">
                  {t("nearby.cta_order")}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/catalog" className="neo-btn px-4 py-2 rounded-xl text-xs font-semibold">
                  {t("nearby.cta_catalog")}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
