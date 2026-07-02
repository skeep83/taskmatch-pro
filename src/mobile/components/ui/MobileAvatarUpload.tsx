import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Upload, X, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageCropper } from './ImageCropper';

interface MobileAvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  userName?: string;
  onAvatarUpdate: (url: string | null) => void;
}

export function MobileAvatarUpload({ userId, currentAvatarUrl, userName, onAvatarUpdate }: MobileAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadAvatar = async (file: File | Blob) => {
    try {
      setUploading(true);

      // Validate file
      if (file instanceof File && !file.type.startsWith('image/')) {
        throw new Error('Файл должен быть изображением');
      }

      const fileSize = file instanceof File ? file.size : file.size;
      if (fileSize > 5 * 1024 * 1024) {
        throw new Error('Размер файла не должен превышать 5MB');
      }

      // Create unique filename with user ID folder structure
      const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
      const fileName = `avatars/${userId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(publicUrl);
      setShowActions(false);
      
      toast({
        title: 'Аватар обновлен',
        description: 'Ваш аватар успешно загружен'
      });

    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Ошибка загрузки',
        description: error.message || 'Не удалось загрузить аватар',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      // Update profile to remove avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      onAvatarUpdate(null);
      setShowActions(false);
      
      toast({
        title: 'Аватар удален',
        description: 'Ваш аватар успешно удален'
      });

    } catch (error: any) {
      console.error('Avatar remove error:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить аватар',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowCropper(true);
      setShowActions(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCrop = async (croppedBlob: Blob) => {
    setShowCropper(false);
    await uploadAvatar(croppedBlob);
  };

  const handleCropperClose = () => {
    setShowCropper(false);
    setSelectedFile(null);
  };

  const handleCameraClick = () => {
    if (uploading) return;
    
    // Если есть аватар, показываем действия, иначе сразу открываем выбор файла
    if (currentAvatarUrl) {
      setShowActions(!showActions);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        {/* Avatar Container */}
        <motion.div
          className="relative"
          whileTap={{ scale: 0.95 }}
        >
          <div 
            className="relative cursor-pointer"
            onClick={handleCameraClick}
          >
            <Avatar className="w-32 h-32 border-4 border-[#E5E7EB] neo-8">
              <AvatarImage src={currentAvatarUrl || ''} alt="Avatar" />
              <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary/10 to-accent/10">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Camera Button */}
          <motion.button
            className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center transition-all hover:neo-2"
            onClick={handleCameraClick}
            disabled={uploading}
            whileTap={{ scale: 0.9 }}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-gray-600" />
            )}
          </motion.button>
        </motion.div>

        {/* Действия */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-10"
            >
              <div className="bg-neo rounded-2xl neo-8 p-4 space-y-3 min-w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowActions(false);
                  }}
                  disabled={uploading}
                  className="w-full flex items-center justify-start gap-3 p-3 rounded-xl hover:bg-white/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImagePlus className="w-4 h-4 text-primary" />
                  </div>
                  <span>Изменить фото</span>
                </Button>

                {currentAvatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeAvatar}
                    disabled={uploading}
                    className="w-full flex items-center justify-start gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 hover:text-red-700"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="w-4 h-4 text-red-600" />
                    </div>
                    <span>Удалить фото</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActions(false)}
                  className="w-full flex items-center justify-center p-2 text-sm text-gray-600"
                >
                  Отмена
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Text */}
      <div className="text-center">
        {uploading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-primary"
          >
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Загружаем...</span>
          </motion.div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-800">
              {currentAvatarUrl ? 'Нажмите для изменения' : 'Добавьте фото профиля'}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG или GIF. Максимум 5MB
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Image Cropper */}
      {selectedFile && (
        <ImageCropper
          isOpen={showCropper}
          onClose={handleCropperClose}
          onCrop={handleCrop}
          imageFile={selectedFile}
        />
      )}
    </div>
  );
}