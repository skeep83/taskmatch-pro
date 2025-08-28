import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

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
  onLoad,
  onError,
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState(src);

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

  // Generate responsive image URLs for different screen sizes
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc.includes('supabase')) return '';
    
    const sizes = [320, 640, 768, 1024, 1280, 1536];
    return sizes
      .map(size => `${baseSrc}?width=${size}&quality=${quality} ${size}w`)
      .join(', ');
  };

  const optimizedSrc = imageSrc.includes('supabase') 
    ? `${imageSrc}?width=${width || 800}&quality=${quality}`
    : imageSrc;

  const srcSet = generateSrcSet(imageSrc);

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
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        srcSet={srcSet}
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
            src={imageSrc}
            alt={alt}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        </DialogContent>
      </Dialog>
    );
  }

  return imageElement;
};