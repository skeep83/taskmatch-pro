import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Camera, 
  Calendar, 
  MapPin, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle,
  Info,
  Eye,
  Settings
} from "lucide-react";
import exifr from "exifr";

interface ImageMetadata {
  // Basic info
  fileSize?: number;
  dimensions?: { width: number; height: number };
  format?: string;
  
  // EXIF data
  camera?: {
    make?: string;
    model?: string;
    software?: string;
  };
  
  // Photo settings
  settings?: {
    iso?: number;
    aperture?: number;
    shutterSpeed?: string;
    focalLength?: number;
    flash?: boolean;
  };
  
  // Location and time
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  
  dateTime?: {
    taken?: string;
    original?: string;
    digitized?: string;
  };
  
  // Technical details
  technical?: {
    colorSpace?: string;
    orientation?: number;
    xResolution?: number;
    yResolution?: number;
    compression?: string;
  };
  
  // Suspicious indicators
  suspiciousIndicators?: {
    noExifData?: boolean;
    inconsistentDates?: boolean;
    manipulationSigns?: boolean;
    gpsDataMissing?: boolean;
    lowResolution?: boolean;
  };
}

interface ImageMetadataViewerProps {
  imageUrl: string;
  onMetadataExtracted?: (metadata: ImageMetadata) => void;
}

export const ImageMetadataViewer = ({ imageUrl, onMetadataExtracted }: ImageMetadataViewerProps) => {
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (imageUrl) {
      extractMetadata(imageUrl);
    }
  }, [imageUrl]);

  const extractMetadata = async (url: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create image element to get basic info
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      // Get file size
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Extract EXIF data
      const exifData = await exifr.parse(blob, true);

      // Analyze image
      const extractedMetadata: ImageMetadata = {
        fileSize: blob.size,
        dimensions: {
          width: img.naturalWidth,
          height: img.naturalHeight
        },
        format: blob.type,
        
        camera: {
          make: exifData?.Make,
          model: exifData?.Model,
          software: exifData?.Software
        },
        
        settings: {
          iso: exifData?.ISO,
          aperture: exifData?.FNumber,
          shutterSpeed: exifData?.ExposureTime ? `1/${Math.round(1/exifData.ExposureTime)}s` : undefined,
          focalLength: exifData?.FocalLength,
          flash: exifData?.Flash !== undefined
        },
        
        location: exifData?.latitude && exifData?.longitude ? {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          altitude: exifData?.GPSAltitude
        } : undefined,
        
        dateTime: {
          taken: exifData?.DateTimeOriginal?.toISOString(),
          original: exifData?.DateTime?.toISOString(),
          digitized: exifData?.DateTimeDigitized?.toISOString()
        },
        
        technical: {
          colorSpace: exifData?.ColorSpace,
          orientation: exifData?.Orientation,
          xResolution: exifData?.XResolution,
          yResolution: exifData?.YResolution,
          compression: exifData?.Compression
        }
      };

      // Analyze suspicious indicators
      extractedMetadata.suspiciousIndicators = analyzeSuspiciousIndicators(exifData, extractedMetadata);

      setMetadata(extractedMetadata);
      onMetadataExtracted?.(extractedMetadata);
      
    } catch (err) {
      console.error('Error extracting metadata:', err);
      setError('Не удалось извлечь метаданные изображения');
    } finally {
      setLoading(false);
    }
  };

  const analyzeSuspiciousIndicators = (exifData: any, metadata: ImageMetadata): ImageMetadata['suspiciousIndicators'] => {
    const indicators: ImageMetadata['suspiciousIndicators'] = {};
    
    // Check for missing EXIF data
    indicators.noExifData = !exifData || Object.keys(exifData).length === 0;
    
    // Check for inconsistent dates
    if (metadata.dateTime?.taken && metadata.dateTime?.digitized) {
      const takenDate = new Date(metadata.dateTime.taken);
      const digitizedDate = new Date(metadata.dateTime.digitized);
      const daysDiff = Math.abs(takenDate.getTime() - digitizedDate.getTime()) / (1000 * 60 * 60 * 24);
      indicators.inconsistentDates = daysDiff > 30; // More than 30 days difference
    }
    
    // Check for manipulation signs
    indicators.manipulationSigns = !metadata.camera?.make || !metadata.camera?.model;
    
    // Check for missing GPS data (could indicate editing)
    indicators.gpsDataMissing = !metadata.location;
    
    // Check for low resolution (could indicate screenshot)
    if (metadata.dimensions) {
      const totalPixels = metadata.dimensions.width * metadata.dimensions.height;
      indicators.lowResolution = totalPixels < 1000000; // Less than 1MP
    }
    
    return indicators;
  };

  const getManipulationReasons = (): string[] => {
    const reasons: string[] = [];
    
    if (!metadata?.camera?.make && !metadata?.camera?.model) {
      reasons.push("Отсутствует информация о камере");
    } else if (!metadata?.camera?.make) {
      reasons.push("Не указан производитель камеры");
    } else if (!metadata?.camera?.model) {
      reasons.push("Не указана модель камеры");
    }
    
    if (!metadata?.settings?.iso && !metadata?.settings?.aperture && !metadata?.settings?.shutterSpeed) {
      reasons.push("Отсутствуют настройки съемки");
    }
    
    if (!metadata?.dateTime?.taken) {
      reasons.push("Нет данных о времени съемки");
    }
    
    if (metadata?.technical?.compression && metadata.technical.compression !== "Uncompressed") {
      reasons.push("Изображение сжато (возможно пересохранено)");
    }
    
    if (metadata?.camera?.software && (
      metadata.camera.software.toLowerCase().includes("photoshop") ||
      metadata.camera.software.toLowerCase().includes("gimp") ||
      metadata.camera.software.toLowerCase().includes("paint") ||
      metadata.camera.software.toLowerCase().includes("editor")
    )) {
      reasons.push(`Обработано в редакторе: ${metadata.camera.software}`);
    }
    
    return reasons;
  };

  const getGpsReasons = (): string[] => {
    const reasons: string[] = [];
    
    if (!metadata?.location?.latitude && !metadata?.location?.longitude) {
      reasons.push("Координаты полностью отсутствуют");
      
      if (metadata?.camera?.make && metadata?.camera?.model) {
        const cameraInfo = `${metadata.camera.make} ${metadata.camera.model}`.toLowerCase();
        if (cameraInfo.includes("iphone") || cameraInfo.includes("samsung") || cameraInfo.includes("pixel")) {
          reasons.push("Современный смартфон обычно записывает GPS");
        }
      }
      
      if (metadata?.dateTime?.taken) {
        const takenDate = new Date(metadata.dateTime.taken);
        const currentYear = new Date().getFullYear();
        if (takenDate.getFullYear() >= currentYear - 2) {
          reasons.push("Недавние фото обычно содержат GPS данные");
        }
      }
      
      reasons.push("GPS данные могли быть удалены при обработке");
      reasons.push("Возможна съемка в помещении или отключенная геолокация");
    }
    
    return reasons;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Неизвестно';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getSuspiciousLevel = (): { level: 'low' | 'medium' | 'high'; count: number } => {
    if (!metadata?.suspiciousIndicators) return { level: 'low', count: 0 };
    
    const indicators = metadata.suspiciousIndicators;
    const suspiciousCount = Object.values(indicators).filter(Boolean).length;
    
    if (suspiciousCount >= 3) return { level: 'high', count: suspiciousCount };
    if (suspiciousCount >= 1) return { level: 'medium', count: suspiciousCount };
    return { level: 'low', count: suspiciousCount };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Анализ метаданных
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
            <span>Извлечение метаданных...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Ошибка анализа
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!metadata) return null;

  const suspiciousLevel = getSuspiciousLevel();

  return (
    <div className="space-y-4">
      {/* Suspicious Indicators Alert */}
      <Card className={`border-l-4 ${
        suspiciousLevel.level === 'high' ? 'border-l-red-500 bg-red-50' :
        suspiciousLevel.level === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
        'border-l-green-500 bg-green-50'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {suspiciousLevel.level === 'high' ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : suspiciousLevel.level === 'medium' ? (
              <Eye className="w-4 h-4 text-yellow-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            Индикаторы подозрительности
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={
              suspiciousLevel.level === 'high' ? 'destructive' :
              suspiciousLevel.level === 'medium' ? 'secondary' : 'default'
            }>
              {suspiciousLevel.level === 'high' ? 'Высокий риск' :
               suspiciousLevel.level === 'medium' ? 'Средний риск' : 'Низкий риск'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Найдено {suspiciousLevel.count} индикаторов
            </span>
          </div>
          
          {suspiciousLevel.count > 0 && (
            <div className="space-y-1 text-sm">
              {metadata.suspiciousIndicators?.noExifData && (
                <div className="text-red-600">• Отсутствуют EXIF данные</div>
              )}
              {metadata.suspiciousIndicators?.inconsistentDates && (
                <div className="text-red-600">• Несовпадающие даты съемки</div>
              )}
              {metadata.suspiciousIndicators?.manipulationSigns && (
                <div className="text-yellow-600">• Возможные признаки редактирования</div>
              )}
              {metadata.suspiciousIndicators?.gpsDataMissing && (
                <div className="text-yellow-600">• Отсутствуют GPS данные</div>
              )}
              {metadata.suspiciousIndicators?.lowResolution && (
                <div className="text-yellow-600">• Низкое разрешение (возможно скриншот)</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Основная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Размер файла:</span>
              <p className="font-medium">{formatFileSize(metadata.fileSize)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Формат:</span>
              <p className="font-medium">{metadata.format || "Неизвестно"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Разрешение:</span>
              <p className="font-medium">
                {metadata.dimensions ? 
                  `${metadata.dimensions.width} × ${metadata.dimensions.height}` : 
                  "Неизвестно"
                }
              </p>
            </div>
          </div>
          
          {/* Manipulation reasons */}
          {getManipulationReasons().length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Признаки возможного редактирования:</h4>
              <ul className="space-y-1 text-sm text-yellow-700">
                {getManipulationReasons().map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* GPS reasons */}
          {getGpsReasons().length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Отсутствие GPS данных:</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                {getGpsReasons().map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Info */}
      {(metadata.camera?.make || metadata.camera?.model) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Информация о камере
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {metadata.camera.make && (
                <div>
                  <span className="text-muted-foreground">Производитель:</span>
                  <p className="font-medium">{metadata.camera.make}</p>
                </div>
              )}
              {metadata.camera.model && (
                <div>
                  <span className="text-muted-foreground">Модель:</span>
                  <p className="font-medium">{metadata.camera.model}</p>
                </div>
              )}
              {metadata.camera.software && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">ПО:</span>
                  <p className="font-medium">{metadata.camera.software}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Settings */}
      {Object.values(metadata.settings || {}).some(Boolean) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Настройки съемки
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {metadata.settings?.iso && (
                <div>
                  <span className="text-muted-foreground">ISO:</span>
                  <p className="font-medium">{metadata.settings.iso}</p>
                </div>
              )}
              {metadata.settings?.aperture && (
                <div>
                  <span className="text-muted-foreground">Диафрагма:</span>
                  <p className="font-medium">f/{metadata.settings.aperture}</p>
                </div>
              )}
              {metadata.settings?.shutterSpeed && (
                <div>
                  <span className="text-muted-foreground">Выдержка:</span>
                  <p className="font-medium">{metadata.settings.shutterSpeed}</p>
                </div>
              )}
              {metadata.settings?.focalLength && (
                <div>
                  <span className="text-muted-foreground">Фокусное расстояние:</span>
                  <p className="font-medium">{metadata.settings.focalLength}мм</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date/Time Info */}
      {Object.values(metadata.dateTime || {}).some(Boolean) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Информация о времени
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2 text-sm">
              {metadata.dateTime?.taken && (
                <div>
                  <span className="text-muted-foreground">Дата съемки:</span>
                  <p className="font-medium">{new Date(metadata.dateTime.taken).toLocaleString('ru-RU')}</p>
                </div>
              )}
              {metadata.dateTime?.digitized && (
                <div>
                  <span className="text-muted-foreground">Дата оцифровки:</span>
                  <p className="font-medium">{new Date(metadata.dateTime.digitized).toLocaleString('ru-RU')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Info */}
      {metadata.location && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Информация о местоположении
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Координаты:</span>
                <p className="font-medium">
                  {metadata.location.latitude?.toFixed(6)}, {metadata.location.longitude?.toFixed(6)}
                </p>
              </div>
              {metadata.location.altitude && (
                <div>
                  <span className="text-muted-foreground">Высота:</span>
                  <p className="font-medium">{metadata.location.altitude.toFixed(1)}м</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};