import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  fallbackSrc?: string;
  enableZoom?: boolean;
  loading?: 'lazy' | 'eager';
  bucket?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  containerClassName,
  width,
  height,
  quality = 85,
  priority = false,
  sizes,
  objectFit = 'cover',
  fallbackSrc,
  enableZoom = false,
  loading = 'lazy',
  bucket,
  onLoad,
  onError,
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState(src);

  // Convert Supabase storage path to public URL
  const publicUrl = useMemo(() => {
    // If it's already a full URL, return as is
    if (src.startsWith('http')) {
      return src;
    }
    
    // If it's a storage path, convert to public URL
    if (bucket) {
      return supabase.storage.from(bucket).getPublicUrl(src).data.publicUrl;
    }
    
    // Try to detect bucket from path
    const pathParts = src.split('/');
    if (pathParts.length >= 2) {
      const detectedBucket = pathParts[0];
      const filePath = pathParts.slice(1).join('/');
      return supabase.storage.from(detectedBucket).getPublicUrl(filePath).data.publicUrl;
    }
    
    // Fallback - assume it's in evidence bucket
    return supabase.storage.from('evidence').getPublicUrl(src).data.publicUrl;
  }, [src, bucket]);

  const handleLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setImageState('loading');
    } else {
      setImageState('error');
    }
    onError?.();
  }, [fallbackSrc, imageSrc, onError]);

  const imageElement = (
    <div className={cn(
      'relative overflow-hidden bg-muted',
      containerClassName
    )}>
      {imageState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {imageState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2" />
          <span className="text-sm">Ошибка загрузки</span>
        </div>
      )}

      <img
        src={publicUrl}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        loading={priority ? 'eager' : loading}
        decoding="async"
        className={cn(
          'transition-opacity duration-300',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down',
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
      />

      {enableZoom && imageState === 'loaded' && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/20 flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
        </div>
      )}
    </div>
  );

  if (enableZoom && imageState === 'loaded') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full text-left cursor-zoom-in">
            {imageElement}
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl w-full">
          <img
            src={publicUrl}
            alt={alt}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        </DialogContent>
      </Dialog>
    );
  }

  return imageElement;
};