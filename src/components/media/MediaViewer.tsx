import React from 'react';
import { OptimizedImage } from './OptimizedImage';
import { VideoPlayer } from './VideoPlayer';
import { cn } from '@/lib/utils';

interface MediaViewerProps {
  src: string;
  alt?: string;
  type?: 'image' | 'video' | 'auto';
  className?: string;
  containerClassName?: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  enableZoom?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  poster?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const isVideoFile = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];
  const urlLower = url.toLowerCase();
  return videoExtensions.some(ext => urlLower.includes(ext));
};

const isImageFile = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  const urlLower = url.toLowerCase();
  return imageExtensions.some(ext => urlLower.includes(ext));
};

export const MediaViewer: React.FC<MediaViewerProps> = ({
  src,
  alt = 'Media content',
  type = 'auto',
  className,
  containerClassName,
  width,
  height,
  objectFit = 'cover',
  enableZoom = false,
  autoplay = false,
  controls = true,
  poster,
  fallbackSrc,
  onLoad,
  onError,
}) => {
  // Auto-detect media type if not specified
  let mediaType = type;
  if (type === 'auto') {
    if (isVideoFile(src)) {
      mediaType = 'video';
    } else if (isImageFile(src)) {
      mediaType = 'image';
    } else {
      // Default to image for unknown types
      mediaType = 'image';
    }
  }

  if (mediaType === 'video') {
    return (
      <VideoPlayer
        url={src}
        className={className}
        containerClassName={containerClassName}
        width={width}
        height={height}
        autoplay={autoplay}
        controls={controls}
        poster={poster}
        onPlay={onLoad}
        onError={onError}
      />
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn('w-full h-full', className)}
      containerClassName={containerClassName}
      width={width}
      height={height}
      objectFit={objectFit}
      enableZoom={enableZoom}
      fallbackSrc={fallbackSrc}
      onLoad={onLoad}
      onError={onError}
    />
  );
};