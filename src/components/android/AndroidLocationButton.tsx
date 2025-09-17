import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Navigation, Shield } from 'lucide-react';
import { useAndroidFeatures } from '@/utils/androidIntegration';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AndroidLocationButtonProps {
  onLocationSelected: (location: { 
    latitude: number; 
    longitude: number; 
    accuracy?: number;
    altitude?: number;
    speed?: number;
  }) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  children?: React.ReactNode;
  highAccuracy?: boolean;
}

export const AndroidLocationButton: React.FC<AndroidLocationButtonProps> = ({
  onLocationSelected,
  className,
  variant = 'outline',
  children,
  highAccuracy = true
}) => {
  const { 
    getCurrentLocation, 
    hapticFeedback, 
    isAndroid,
    requestLocationPermissions 
  } = useAndroidFeatures();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const checkAndRequestPermissions = async () => {
    if (!isAndroid) return true;
    
    try {
      const permissions = await requestLocationPermissions();
      
      if (permissions.location === 'denied' && permissions.coarseLocation === 'denied') {
        setShowPermissionDialog(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      toast.error('Ошибка проверки разрешений геолокации');
      return false;
    }
  };

  const handleGetLocation = async () => {
    try {
      setIsLoading(true);
      hapticFeedback.light();
      
      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) return;
      
      if (isAndroid) {
        // Используем нативную геолокацию на Android
        const location = await getCurrentLocation();
        onLocationSelected(location);
        toast.success(`Местоположение определено${location.accuracy ? ` (точность: ${Math.round(location.accuracy)}м)` : ''}`);
        hapticFeedback.notification();
      } else {
        // Fallback для веб-версии
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude || undefined,
                speed: position.coords.speed || undefined
              };
              onLocationSelected(location);
              toast.success('Местоположение определено');
            },
            (error) => {
              console.error('Geolocation error:', error);
              let errorMessage = 'Ошибка получения местоположения';
              
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Доступ к геолокации запрещен';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Местоположение недоступно';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Время ожидания истекло';
                  break;
              }
              
              toast.error(errorMessage);
            },
            {
              enableHighAccuracy: highAccuracy,
              timeout: 15000,
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
      if (isAndroid) {
        hapticFeedback.error();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        className={`${className} android-button`}
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

      {/* Диалог разрешений */}
      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent className="android-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <Navigation className="w-5 h-5" />
              Необходим доступ к местоположению
            </AlertDialogTitle>
            <AlertDialogDescription>
              Для определения вашего местоположения и поиска ближайших специалистов необходимо предоставить разрешение.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Точное местоположение - для поиска специалистов рядом</span>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span>Приблизительное местоположение - для определения города</span>
            </div>
            {highAccuracy && (
              <div className="flex items-center gap-2 text-blue-600">
                <Shield className="w-4 h-4" />
                <span>Высокая точность - используется GPS для лучшего результата</span>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Зачем нам ваше местоположение?</strong>
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 list-disc list-inside space-y-1">
              <li>Поиск специалистов в вашем районе</li>
              <li>Расчет времени прибытия мастера</li>
              <li>Показ актуальных предложений в вашем городе</li>
            </ul>
          </div>
          
          <AlertDialogFooter className="flex-col space-y-2">
            <AlertDialogAction
              onClick={async () => {
                setShowPermissionDialog(false);
                try {
                  await requestLocationPermissions();
                  // После предоставления разрешений, пробуем снова получить местоположение
                  setTimeout(() => {
                    handleGetLocation();
                  }, 500);
                } catch (error) {
                  toast.error('Откройте настройки приложения для предоставления разрешений');
                }
              }}
              className="w-full android-button android-button-primary"
            >
              <Shield className="w-4 h-4 mr-2" />
              Предоставить доступ
            </AlertDialogAction>
            
            <AlertDialogCancel className="w-full android-button">
              Отмена
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};