import { useEffect, type RefObject } from "react";
import { loadGoogleMaps, type PickedLocation } from "@/lib/googleMaps";

/**
 * Attaches Google Places Autocomplete (Moldova-restricted) to a plain
 * text input. Fires onPlace with coordinates and the formatted address
 * when the user picks a suggestion. No-op when Maps is unavailable.
 */
export const useAddressAutocomplete = (
  inputRef: RefObject<HTMLInputElement>,
  onPlace: (loc: PickedLocation) => void,
) => {
  useEffect(() => {
    let ac: google.maps.places.Autocomplete | null = null;
    let cancelled = false;
    void loadGoogleMaps().then((g) => {
      if (cancelled || !g?.maps?.places || !inputRef.current) return;
      ac = new g.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "md" },
        fields: ["geometry", "formatted_address"],
        types: ["geocode"],
      });
      ac.addListener("place_changed", () => {
        const place = ac?.getPlace();
        const loc = place?.geometry?.location;
        if (!loc) return;
        onPlace({
          latitude: loc.lat(),
          longitude: loc.lng(),
          address: (place.formatted_address || "").replace(/, Молдова$|, Moldova$/, ""),
        });
      });
    });
    return () => {
      cancelled = true;
      if (ac && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(ac);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
