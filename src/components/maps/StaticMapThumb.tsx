import { useEffect, useState } from "react";
import { getGoogleMapsKey } from "@/lib/googleMaps";

let cachedKey: string | null = null;

interface StaticMapThumbProps {
  latitude: number;
  longitude: number;
  className?: string;
  zoom?: number;
  alt?: string;
}

/**
 * Lightweight Static Maps image for job cards: no JS map instance,
 * one cached <img>. Hides itself when the key is missing or the
 * request fails.
 */
export const StaticMapThumb = ({ latitude, longitude, className = "", zoom = 14, alt = "" }: StaticMapThumbProps) => {
  const [key, setKey] = useState<string | null>(cachedKey);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cachedKey !== null) return;
    void getGoogleMapsKey().then((k) => {
      cachedKey = k || "";
      setKey(cachedKey);
    });
  }, []);

  if (!key || failed) return null;

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(zoom),
    size: "640x160",
    scale: "2",
    language: "ru",
    region: "MD",
    markers: `color:0x2563eb|${latitude},${longitude}`,
    key,
  });
  // calmer look: hide POI labels
  const style = "&style=feature:poi|visibility:off&style=feature:transit|element:labels.icon|visibility:off";
  const src = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}${style}`;

  return (
    <div className={`rounded-xl overflow-hidden bg-neo neo-inset-2 ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
