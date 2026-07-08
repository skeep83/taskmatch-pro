import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, GMAPS_AUTH_FAILURE_EVENT } from "@/lib/googleMaps";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { MapPin, LocateFixed, Loader2, Footprints, Car } from "lucide-react";

interface JobLocationMapProps {
  latitude: number;
  longitude: number;
  address?: string | null;
  className?: string;
}

const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`);

/**
 * Read-only map with the job's pin + distance from the viewer.
 * Distance is straight-line with rough walk/drive time estimates.
 * Renders nothing when coordinates or the Maps key are unavailable.
 */
export const JobLocationMap = ({ latitude, longitude, address, className = "" }: JobLocationMapProps) => {
  const { t } = useEnhancedI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [driveText, setDriveText] = useState<string | null>(null);
  const [walkText, setWalkText] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadGoogleMaps().then((g) => {
      if (cancelled) return;
      if (!g || !containerRef.current) { setReady(false); return; }
      const pos = { lat: latitude, lng: longitude };
      const map = new g.maps.Map(containerRef.current, {
        center: pos,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        clickableIcons: false,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        ],
      });
      new g.maps.Marker({ position: pos, map, title: address || "" });
      mapRef.current = map;
      setReady(true);

      // If the browser already granted geolocation, show the distance right away
      if (navigator.permissions?.query) {
        void navigator.permissions.query({ name: "geolocation" as PermissionName }).then((st) => {
          if (st.state === "granted") measure();
        }).catch(() => null);
      }
    });
    const onAuthFail = () => setReady(false);
    window.addEventListener(GMAPS_AUTH_FAILURE_EVENT, onAuthFail);
    return () => { cancelled = true; window.removeEventListener(GMAPS_AUTH_FAILURE_EVENT, onAuthFail); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  const measure = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    setDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(pos.coords.latitude, pos.coords.longitude, latitude, longitude);
        setDistanceKm(km);
        setLocating(false);
        // Real travel times when the Distance Matrix service is available
        const g = window.google;
        if (g?.maps?.DistanceMatrixService) {
          const svc = new g.maps.DistanceMatrixService();
          const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const dest = { lat: latitude, lng: longitude };
          svc.getDistanceMatrix(
            { origins: [origin], destinations: [dest], travelMode: g.maps.TravelMode.DRIVING },
            (res, status) => {
              const el = res?.rows?.[0]?.elements?.[0];
              if (status === "OK" && el?.status === "OK" && el.duration) setDriveText(el.duration.text);
            }
          );
          if (km <= 8) {
            svc.getDistanceMatrix(
              { origins: [origin], destinations: [dest], travelMode: g.maps.TravelMode.WALKING },
              (res, status) => {
                const el = res?.rows?.[0]?.elements?.[0];
                if (status === "OK" && el?.status === "OK" && el.duration) setWalkText(el.duration.text);
              }
            );
          }
        }
      },
      () => { setLocating(false); setDenied(true); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  if (ready === false) return null;

  const walkMin = distanceKm != null ? Math.max(1, Math.round((distanceKm / 4.5) * 60)) : null;
  const driveMin = distanceKm != null ? Math.max(1, Math.round((distanceKm / 28) * 60)) : null;

  return (
    <div className={className}>
      <div className="relative rounded-2xl overflow-hidden bg-neo neo-inset-2">
        <div ref={containerRef} className="w-full h-48 md:h-56" />
        {ready === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-neo">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-2.5">
        {distanceKm == null ? (
          <button
            type="button"
            onClick={measure}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-full bg-neo neo-2 hover:neo-4 px-3 py-1.5 text-xs font-medium text-foreground transition-all disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 text-primary" />}
            {t("map.distance_btn")}
          </button>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              {t("map.distance_away", { distance: fmtKm(distanceKm) })}
            </span>
            {(walkText || (walkMin != null && walkMin <= 90)) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-neo neo-inset-1 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                <Footprints className="w-3 h-3" />
                {walkText || `~${walkMin} ${t("map.min")}`}
              </span>
            )}
            {(driveText || driveMin != null) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-neo neo-inset-1 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                <Car className="w-3 h-3" />
                {driveText || `~${driveMin} ${t("map.min")}`}
              </span>
            )}
            {!driveText && <span className="text-[11px] text-muted-foreground">{t("map.straight_line")}</span>}
          </>
        )}
        {denied && <span className="text-[11px] text-muted-foreground">{t("map.geo_denied")}</span>}
      </div>
    </div>
  );
};
