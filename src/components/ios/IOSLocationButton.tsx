import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { useIOSFeatures } from '@/utils/iosIntegration';
import { toast } from 'sonner';

interface IOSLocationButtonProps {
  onLocationSelected: (location: { latitude: number; longitude: number; accuracy?: number }) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  children?: React.ReactNode;
}

export const IOSLocationButton: React.FC<IOSLocationButtonProps> = ({
  onLocationSelected,
  className,
  variant = 'outline',
  children
}) => {
  const { getCurrentLocation, hapticFeedback, isIOS } = useIOSFeatures();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetLocation = async () => {
    try {
      setIsLoading(true);
      hapticFeedback.light();
      
      if (isIOS) {
        // Используем нативную геолокацию на iOS
        const location = await getCurrentLocation();
        onLocationSelected(location);
        toast.success('Местоположение определено');
        hapticFeedback.medium();
      } else {
        // Fallback для веб-версии
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              };
              onLocationSelected(location);
              toast.success('Местоположение определено');
            },
            (error) => {
              console.error('Geolocation error:', error);
              toast.error('Ошибка получения местоположения');
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        } else {
          toast.error('Геолокация не поддерживается');
        }
      }
    } catch (error: any) {
      console.error('Location error:', error);
      toast.error(error.message || 'Ошибка определения местоположения');
      if (isIOS) {
        hapticFeedback.heavy();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleGetLocation}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <MapPin className="w-4 h-4 mr-2" />
      )}
      {children || 'Определить местоположение'}
    </Button>
  );
};