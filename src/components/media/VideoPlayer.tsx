import React, { useState, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

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
  onError?: (error: any) => void;
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
  const [playing, setPlaying] = useState(autoplay);
  const [volume, setVolume] = useState(muted ? 0 : 0.8);
  const [isMuted, setIsMuted] = useState(muted);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback((error: any) => {
    setError('Ошибка загрузки видео');
    setLoading(false);
    onError?.(error);
  }, [onError]);

  const handleReady = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const handleProgress = useCallback((state: { played: number }) => {
    setProgress(state.played);
  }, []);

  const handleDuration = useCallback((duration: number) => {
    setDuration(duration);
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    setProgress(value[0] / 100);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const togglePlay = useCallback(() => {
    setPlaying(!playing);
  }, [playing]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={cn(
        'relative flex flex-col items-center justify-center bg-muted rounded-lg',
        'min-h-[200px] text-muted-foreground',
        containerClassName
      )}>
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        containerClassName
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(playing ? false : true)}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      )}

      <ReactPlayer
        {...({
          url,
          width,
          height,
          playing,
          loop,
          volume: isMuted ? 0 : volume,
          muted: isMuted,
          controls: false,
          onPlay: handlePlay,
          onPause: handlePause,
          onEnded: handleEnded,
          onError: handleError,
          onReady: handleReady,
          onProgress: handleProgress,
          onDuration: handleDuration,
        } as any)}
        className={cn('react-player', className)}
      />

      {controls && (
        <div className={cn(
          'absolute inset-0 flex flex-col justify-end transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          {/* Play/Pause Button (Center) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="h-16 w-16 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
            >
              {playing ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8 ml-1" />
              )}
            </Button>
          </div>

          {/* Controls Bar */}
          <div className="relative p-4 space-y-2">
            {/* Progress Bar */}
            <Slider
              value={[progress * 100]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full"
            />

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    onValueChange={(value) => {
                      setVolume(value[0] / 100);
                      setIsMuted(value[0] === 0);
                    }}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white text-sm">
                  {formatTime(progress * duration)} / {formatTime(duration)}
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const elem = document.documentElement;
                    if (elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};