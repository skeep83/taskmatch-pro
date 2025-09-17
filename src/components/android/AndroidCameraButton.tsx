import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, Shield, AlertTriangle } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AndroidCameraButtonProps {
  onImageSelected: (imageUrl: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  children?: React.ReactNode;
}

export const AndroidCameraButton: React.FC<AndroidCameraButtonProps> = ({
  onImageSelected,
  className,
  variant = 'outline',
  children
}) => {
  const { 
    takePicture, 
    selectFromGallery, 
    hapticFeedback, 
    isAndroid,
    requestCameraPermissions
  } = useAndroidFeatures();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const checkAndRequestPermissions = async () => {
    if (!isAndroid) return true;
    
    try {
      const permissions = await requestCameraPermissions();
      
      if (permissions.camera === 'denied' || permissions.photos === 'denied') {
        setShowPermissionDialog(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      toast.error('Ошибка проверки разрешений');
      return false;
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      hapticFeedback.light();
      
      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) return;
      
      const imageUrl = await takePicture();
      if (imageUrl) {
        onImageSelected(imageUrl);
        toast.success('Фото успешно сделано');
        hapticFeedback.notification();
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      toast.error(error.message || 'Ошибка камеры');
      hapticFeedback.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      setIsLoading(true);
      hapticFeedback.light();
      
      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) return;
      
      const imageUrl = await selectFromGallery();
      if (imageUrl) {
        onImageSelected(imageUrl);
        toast.success('Фото выбрано из галереи');
        hapticFeedback.notification();
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      toast.error(error.message || 'Ошибка галереи');
      hapticFeedback.error();
    } finally {
      setIsLoading(false);
    }
  };

  // Для веб-версии показываем простую кнопку
  if (!isAndroid) {
    return (
      <Button
        variant={variant}
        className={className}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              onImageSelected(url);
            }
          };
          input.click();
        }}
      >
        <Camera className="w-4 h-4 mr-2" />
        {children || 'Выбрать фото'}
      </Button>
    );
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={variant}
            className={className}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            {children || 'Добавить фото'}
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent className="android-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Выберите источник фото
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы можете сделать новое фото или выбрать из галереи
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex-col space-y-3">
            <AlertDialogAction
              onClick={handleTakePhoto}
              disabled={isLoading}
              className="w-full android-button android-button-primary"
            >
              <Camera className="w-4 h-4 mr-2" />
              Сделать фото
            </AlertDialogAction>
            
            <Button
              onClick={handleSelectFromGallery}
              disabled={isLoading}
              variant="outline"
              className="w-full android-button"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Выбрать из галереи
            </Button>
            
            <AlertDialogCancel className="w-full android-button">
              Отмена
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог разрешений */}
      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent className="android-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <Shield className="w-5 h-5" />
              Необходимы разрешения
            </AlertDialogTitle>
            <AlertDialogDescription>
              Для работы с камерой и галереей необходимо предоставить разрешения в настройках Android.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Доступ к камере - для создания фото</span>
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>Доступ к галерее - для выбора существующих фото</span>
            </div>
          </div>
          
          <AlertDialogFooter className="flex-col space-y-2">
            <AlertDialogAction
              onClick={async () => {
                setShowPermissionDialog(false);
                try {
                  await requestCameraPermissions();
                  toast.success('Проверьте разрешения в настройках');
                } catch (error) {
                  toast.error('Откройте настройки приложения вручную');
                }
              }}
              className="w-full android-button android-button-primary"
            >
              <Shield className="w-4 h-4 mr-2" />
              Предоставить разрешения
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