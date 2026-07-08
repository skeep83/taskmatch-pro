import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, googleReverseGeocode, type PickedLocation } from "@/lib/googleMaps";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { MapPin, LocateFixed, Loader2, Check } from "lucide-react";

const CHISINAU = { lat: 47.0105, lng: 28.8638 };

interface LocationPickerMapProps {
  /** Initial position (e.g. previously chosen address) */
  initial?: { latitude: number; longitude: number } | null;
  /** Fired when the user confirms the pinned address */
  onSelect: (loc: PickedLocation) => void;
  className?: string;
}

/**
 * Taxi-style address picker: the pin stays centered while the map pans
 * underneath. On idle the center is reverse-geocoded to a formatted
 * address; the locate button jumps to the user's GPS position.
 * Renders nothing when no Google Maps key is configured.
 */
export const LocationPickerMap = ({ initial, onSelect, className = "" }: LocationPickerMapProps) => {
  const { t } = useEnhancedI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const idleTimer = useRef<number>();
  const [ready, setReady] = useState<boolean | null>(null); // null = loading
  const [address, setAddress] = useState("");
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadGoogleMaps().then((g) => {
      if (cancelled) return;
      if (!g || !containerRef.current) { setReady(false); return; }
      const center = initial ? { lat: initial.latitude, lng: initial.longitude } : CHISINAU;
      const map = new g.maps.Map(containerRef.current, {
        center,
        zoom: initial ? 17 : 13,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        clickableIcons: false,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        ],
      });
      mapRef.current = map;

      const resolveCenter = () => {
        const c = map.getCenter();
        if (!c) return;
        setResolving(true);
        void googleReverseGeocode(c.lat(), c.lng()).then((addr) => {
          setAddress(addr);
          setResolving(false);
        });
      };

      map.addListener("dragstart", () => setMoving(true));
      map.addListener("idle", () => {
        setMoving(false);
        window.clearTimeout(idleTimer.current);
        idleTimer.current = window.setTimeout(resolveCenter, 250);
      });
      setReady(true);
      resolveCenter();
    });
    return () => { cancelled = true; window.clearTimeout(idleTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(17);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirm = () => {
    const c = mapRef.current?.getCenter();
    if (!c || !address) return;
    onSelect({ latitude: c.lat(), longitude: c.lng(), address });
  };

  if (ready === false) return null; // no key configured — keep the text-input flow

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-neo neo-inset-2 ${className}`}>
      <div ref={containerRef} className="w-full h-64 md:h-72" />

      {ready === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-neo">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {ready && (
        <>
          {/* Centered pin (lifts while dragging, like a taxi app) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
            <MapPin
              className={`w-9 h-9 text-primary drop-shadow-lg transition-transform duration-150 ${moving ? "-translate-y-1.5 scale-110" : ""}`}
              fill="currentColor"
              strokeWidth={1}
            />
            <div className={`mx-auto w-1.5 h-1.5 rounded-full bg-foreground/30 blur-[1px] transition-all ${moving ? "scale-150 opacity-60" : ""}`} />
          </div>

          {/* Locate me */}
          <button
            type="button"
            onClick={locate}
            aria-label={t("map.locate")}
            className="absolute right-3 top-3 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-primary hover:scale-105 active:scale-95 transition-transform"
          >
            {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
          </button>

          {/* Address card */}
          <div className="absolute left-3 right-3 bottom-3 z-10">
            <div className="rounded-xl bg-white/95 backdrop-blur shadow-xl px-3.5 py-2.5 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
                {resolving ? t("map.resolving") : address || t("map.move_pin")}
              </span>
              <button
                type="button"
                onClick={confirm}
                disabled={!address || resolving}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" />
                {t("map.confirm")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
