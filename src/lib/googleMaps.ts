import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let keyPromise: Promise<string> | null = null;
let loadPromise: Promise<typeof google | null> | null = null;

/** Google calls window.gm_authFailure on key/billing/referrer errors. */
export const GMAPS_AUTH_FAILURE_EVENT = "gmaps-auth-failure";
const installAuthFailureHook = () => {
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    console.error(
      "Google Maps auth failure: the key is invalid, billing is off, or this site's URL is not in the key's allowed referrers. " +
      "Fix it in Google Cloud Console -> Credentials -> your key -> Website restrictions."
    );
    window.dispatchEvent(new CustomEvent(GMAPS_AUTH_FAILURE_EVENT));
  };
};

/** Reads the Google Maps browser key from platform settings (admin-configurable). */
export const getGoogleMapsKey = (): Promise<string> => {
  if (!keyPromise) {
    keyPromise = supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "google_maps_api_key")
      .maybeSingle()
      .then(({ data }) => {
        let v = data?.value as unknown;
        if (typeof v === "string") { try { v = JSON.parse(v); } catch { /* raw */ } }
        return String(v || "");
      });
  }
  return keyPromise;
};

/** Loads the Maps JS API once; resolves null when no key is configured. */
export const loadGoogleMaps = (): Promise<typeof google | null> => {
  if (!loadPromise) {
    loadPromise = (async () => {
      if (window.google?.maps) return window.google;
      const key = await getGoogleMapsKey();
      if (!key) return null;
      installAuthFailureHook();
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=ru&region=MD&loading=async`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("maps load failed"));
        document.head.appendChild(s);
      });
      // loading=async: wait for maps namespace
      for (let i = 0; i < 50 && !window.google?.maps?.Map; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return window.google?.maps?.Map ? window.google : null;
    })().catch(() => null);
  }
  return loadPromise;
};

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address: string;
}

/** Reverse-geocodes to a properly formatted street address (RU locale, MD region). */
export const googleReverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const g = await loadGoogleMaps();
  if (!g) return "";
  const geocoder = new g.maps.Geocoder();
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    const best =
      results.find((r) => r.types.includes("street_address")) ||
      results.find((r) => r.types.includes("premise")) ||
      results.find((r) => r.types.includes("route")) ||
      results[0];
    return best?.formatted_address?.replace(/, Молдова$|, Moldova$/, "") || "";
  } catch {
    return "";
  }
};
