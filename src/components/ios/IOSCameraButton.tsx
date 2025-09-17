import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useIOSFeatures } from '@/utils/iosIntegration';
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

interface IOSCameraButtonProps {
  onImageSelected: (imageUrl: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  children?: React.ReactNode;
}

export const IOSCameraButton: React.FC<IOSCameraButtonProps> = ({
  onImageSelected,
  className,
  variant = 'outline',
  children
}) => {
  const { takePicture, selectFromGallery, hapticFeedback, isIOS } = useIOSFeatures();
  const [isLoading, setIsLoading] = useState(false);

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      hapticFeedback.light();
      
      const imageUrl = await takePicture();
      if (imageUrl) {
        onImageSelected(imageUrl);
        toast.success('Фото успешно сделано');
        hapticFeedback.medium();
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      toast.error(error.message || 'Ошибка камеры');
      hapticFeedback.heavy();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      setIsLoading(true);
      hapticFeedback.light();
      
      const imageUrl = await selectFromGallery();
      if (imageUrl) {
        onImageSelected(imageUrl);
        toast.success('Фото выбрано из галереи');
        hapticFeedback.medium();
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      toast.error(error.message || 'Ошибка галереи');
      hapticFeedback.heavy();
    } finally {
      setIsLoading(false);
    }
  };

  // Для веб-версии показываем простую кнопку
  if (!isIOS) {
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
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Выберите источник фото</AlertDialogTitle>
          <AlertDialogDescription>
            Вы можете сделать новое фото или выбрать из галереи
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col space-y-2">
          <AlertDialogAction
            onClick={handleTakePhoto}
            disabled={isLoading}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            Сделать фото
          </AlertDialogAction>
          
          <Button
            onClick={handleSelectFromGallery}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Выбрать из галереи
          </Button>
          
          <AlertDialogCancel className="w-full">
            Отмена
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};