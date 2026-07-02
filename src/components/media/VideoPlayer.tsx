import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  className?: string;
  containerClassName?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  poster?: string;
  preload?: 'none' | 'metadata' | 'auto';
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  className,
  containerClassName,
  width = '100%',
  height = 'auto',
  autoplay = false,
  loop = false,
  muted = false,
  controls = true,
  poster,
  preload = 'metadata',
  onPlay,
  onPause,
  onEnded,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoadedData = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setLoading(false);
    setError('Ошибка загрузки видео');
    onError?.(event);
  }, [onError]);

  if (error) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center bg-muted rounded-lg min-h-[200px] text-muted-foreground',
          containerClassName,
        )}
      >
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-black rounded-lg overflow-hidden', containerClassName)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      )}

      <video
        src={url}
        className={cn('block w-full h-full bg-black', className)}
        style={{ width, height }}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
        preload={preload}
        poster={poster}
        controlsList="nodownload noplaybackrate"
        onLoadedData={handleLoadedData}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={handleError}
      >
        <source src={url} />
        Ваш браузер не поддерживает воспроизведение видео.
      </video>
    </div>
  );
};
