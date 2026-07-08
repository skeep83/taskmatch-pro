import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type LocationSource = 'device_gps' | 'address_geocode' | 'ip_geolocate' | 'map';
export type LocationPrecision = 'exact' | 'street' | 'district' | 'city';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  address: string;
  publicLabel: string;
  source: LocationSource;
  precision: LocationPrecision;
  accuracy?: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  suburb?: string;
  neighbourhood?: string;
  road?: string;
  house_number?: string;
  country?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

const DEFAULT_FETCH_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'ru,en;q=0.9,ro;q=0.8',
};

const isNativeMobile = () => {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
};

const buildPublicLabel = (address?: NominatimAddress) => {
  if (!address) return 'Локация уточняется';

  const locality = address.suburb || address.neighbourhood || address.city || address.town || address.village || address.municipality;
  const region = address.city || address.town || address.village || address.county || address.state;
  return [locality, region].filter(Boolean).join(', ') || 'Локация уточняется';
};

const inferPrecision = (address?: NominatimAddress): LocationPrecision => {
  if (!address) return 'city';
  if (address.house_number || address.road) return 'street';
  if (address.suburb || address.neighbourhood) return 'district';
  if (address.city || address.town || address.village || address.municipality) return 'city';
  return 'city';
};

const fallbackAddress = (lat: number, lng: number) => `Координаты: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

interface IpWhoIsResult {
  success?: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
  message?: string;
}

async function getApproximateLocationFromIp(): Promise<ResolvedLocation> {
  const response = await fetch('https://ipwho.is/', {
    headers: DEFAULT_FETCH_HEADERS,
  });

  if (!response.ok) {
    throw new Error('Не удалось определить примерную локацию по IP');
  }

  const data = (await response.json()) as IpWhoIsResult;
  if (data.success === false || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error(data.message || 'Не удалось определить примерную локацию по IP');
  }

  const publicLabel = [data.city, data.region, data.country].filter(Boolean).join(', ') || 'Примерная локация по IP';

  try {
    const resolved = await reverseGeocode(data.latitude, data.longitude);
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      address: resolved.address,
      publicLabel,
      precision: 'city',
      source: 'ip_geolocate',
    };
  } catch {
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      address: publicLabel,
      publicLabel,
      precision: 'city',
      source: 'ip_geolocate',
    };
  }
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: DEFAULT_FETCH_HEADERS,
  });

  if (!response.ok) {
    throw new Error('Не удалось определить адрес по координатам');
  }

  const data = (await response.json()) as NominatimResult;
  return {
    address: data.display_name || fallbackAddress(latitude, longitude),
    publicLabel: buildPublicLabel(data.address),
    precision: inferPrecision(data.address),
  };
}

export async function geocodeAddress(query: string): Promise<ResolvedLocation> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Введите адрес');
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: DEFAULT_FETCH_HEADERS,
  });

  if (!response.ok) {
    throw new Error('Не удалось найти адрес');
  }

  const results = (await response.json()) as NominatimResult[];
  const first = results[0];
  if (!first) {
    throw new Error('Адрес не найден. Уточните формулировку.');
  }

  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    address: first.display_name,
    publicLabel: buildPublicLabel(first.address),
    precision: inferPrecision(first.address),
    source: 'address_geocode',
  };
}

export async function getCurrentResolvedLocation(): Promise<ResolvedLocation> {
  if (!isNativeMobile() && !window.isSecureContext) {
    return getApproximateLocationFromIp();
  }

  const coords = isNativeMobile()
    ? await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      })
    : await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Геолокация не поддерживается браузером'));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('Доступ к геолокации запрещён в браузере. Разрешите доступ к местоположению для сайта.'));
            return;
          }
          if (error.code === error.TIMEOUT) {
            reject(new Error('Не удалось получить координаты вовремя. Попробуйте ещё раз или введите адрес вручную.'));
            return;
          }
          reject(new Error('Не удалось определить местоположение'));
        }, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
      });

  const latitude = coords.coords.latitude;
  const longitude = coords.coords.longitude;
  const accuracy = coords.coords.accuracy;

  try {
    const resolved = await reverseGeocode(latitude, longitude);
    return {
      latitude,
      longitude,
      accuracy,
      source: 'device_gps',
      ...resolved,
    };
  } catch {
    return {
      latitude,
      longitude,
      accuracy,
      source: 'device_gps',
      address: fallbackAddress(latitude, longitude),
      publicLabel: 'Локация по GPS',
      precision: 'exact',
    };
  }
}
