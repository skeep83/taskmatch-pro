import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface VideoThumbnailProps {
  src: string;
  className?: string;
  overlayLabel?: string;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  src,
  className,
  overlayLabel = 'Видео',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const thumbnailSrc = useMemo(() => {
    if (!src) return src;
    return src.includes('#') ? src : `${src}#t=0.1`;
  }, [src]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900', className)}>
      {!hasError && (
        <video
          src={thumbnailSrc}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}

      {(!isLoaded || hasError) && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_32%)]" />
      )}

      <div className="absolute inset-0 bg-black/10" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-white">
        <div className="rounded-full bg-black/35 backdrop-blur-sm px-4 py-3 text-lg shadow-lg">
          ▶
        </div>
        <div className="text-xs font-medium tracking-wide uppercase text-white/95 drop-shadow-sm">
          {overlayLabel}
        </div>
      </div>
    </div>
  );
};
