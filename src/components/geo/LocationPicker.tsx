import { useState } from 'react';
import { MapPin, Navigation, Search, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useGeolocation, formatDistance } from '@/hooks/useGeolocation';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useEnhancedI18n } from "@/i18n/enhanced";

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number; address: string };
  className?: string;
}

const predefinedLocations = [
  { name: 'Центр Кишинёва', name_ro: 'Centrul Chișinăului', lat: 47.0245, lng: 28.8322, address: 'Piața Marii Adunări Naționale, Chișinău' },
  { name: 'Ботанический сад', name_ro: 'Grădina Botanică', lat: 47.0278, lng: 28.8155, address: 'Grădina Botanică, Chișinău' },
  { name: 'Аэропорт', name_ro: 'Aeroport', lat: 46.9277, lng: 28.9311, address: 'Aeroportul Internațional Chișinău' },
  { name: 'Мол Дафия', name_ro: 'Mall Dafiya', lat: 47.0447, lng: 28.8414, address: 'Dacia Boulevard 53/1, Chișinău' },
  { name: 'Парк Валя Морилор', name_ro: 'Parcul Valea Morilor', lat: 47.0196, lng: 28.8064, address: 'Parcul Valea Morilor, Chișinău' },
];

export const LocationPicker = ({ onLocationSelect, initialLocation, className }: LocationPickerProps) => {
  const { t } = useEnhancedI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const { latitude, longitude, loading, getCurrentLocation, hasLocation } = useGeolocation();

  const handleCurrentLocation = () => {
    if (hasLocation && latitude && longitude) {
      const location = {
        lat: latitude,
        lng: longitude,
        address: t("ui.moe_mestopolozhenie")
      };
      setSelectedLocation(location);
      onLocationSelect(location);
      toast({
        title: t("ui.mestopolozhenie_ustanovleno"),
        description: t("ui.ispolzuetsia_vashe_tekuschee_mestopolozh"),
      });
    } else {
      getCurrentLocation();
    }
  };

  const handlePredefinedLocation = (location: typeof predefinedLocations[0]) => {
    const selectedLoc = {
      lat: location.lat,
      lng: location.lng,
      address: location.address
    };
    setSelectedLocation(selectedLoc);
    onLocationSelect(selectedLoc);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    // Simulate geocoding - in real app, use Google Maps Geocoding API or similar
    toast({
      title: t("ui.poisk_adresa_2"),
      description: t("ui.funkciia_poiska_budet_dobavlena"),
    });
  };

  const filteredLocations = predefinedLocations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.name_ro.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t("ui.vyberite_mestopolozhenie")}</h3>
        </div>

        {/* Current Location Button */}
        <Button
          onClick={handleCurrentLocation}
          disabled={loading}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Navigation className="h-4 w-4" />
          {loading ? t("ui.opredelenie_mestopolozheniia") : t("ui.ispolzovat_moe_mestopolozhenie")}
          {hasLocation && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
        </Button>

        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder={t("ui.poisk_adresa")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Predefined Locations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Популярные места</h4>
          <div className="grid gap-2">
            {filteredLocations.map((location, index) => (
              <Button
                key={index}
                onClick={() => handlePredefinedLocation(location)}
                variant="ghost"
                className={cn(
                  'w-full justify-start h-auto p-3 text-left',
                  selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng &&
                  'bg-primary/10 border border-primary/20'
                )}
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 w-full">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">{location.name}</span>
                    {hasLocation && latitude && longitude && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistance(calculateDistance(latitude, longitude, location.lat, location.lng))}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground ml-6">{location.address}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Selected Location Display */}
        {selectedLocation && (
          <div className="mt-4 p-3 bg-primary/5 rounded-md border">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">{t("ui.vybrannoe_mestopolozhenie")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{selectedLocation.address}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function for distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};