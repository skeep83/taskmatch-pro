import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Move, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  documentType: string;
  fileName?: string;
}

export const DocumentViewer = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  documentType, 
  fileName 
}: DocumentViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);

  // Generate signed URL for secure image access
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!imageUrl || !isOpen) return;
      
      setIsLoading(true);
      setImageError(false);
      
      try {
        // Extract the path from the full URL
        const urlParts = imageUrl.split('/kyc/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          
          const { data, error } = await supabase.storage
            .from('kyc')
            .createSignedUrl(filePath, 300); // 5 minutes
          
          if (error) {
            console.error('Error creating signed URL:', error);
            setSignedUrl(imageUrl); // Fallback to original URL
          } else {
            setSignedUrl(data.signedUrl);
          }
        } else {
          setSignedUrl(imageUrl); // Use original URL if path extraction fails
        }
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setSignedUrl(imageUrl); // Fallback to original URL
      }
    };

    generateSignedUrl();
  }, [imageUrl, isOpen]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(scale + delta, 0.5), 5);
    setScale(newScale);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || `document-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case 'id_card':
        return 'Документ удостоверения личности';
      case 'selfie':
        return 'Селфи с документом';
      default:
        return 'Документ';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] p-0">
        <DialogDescription className="sr-only">
          Интерактивный просмотр документа для верификации с возможностью увеличения и перемещения
        </DialogDescription>
        <DialogHeader className="p-3 pb-1">
          <DialogTitle className="flex items-center justify-between">
            <span>{getDocumentTitle()}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 5}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadImage}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 overflow-hidden bg-muted/10">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
            <Move className="w-4 h-4" />
            <span>Масштаб: {Math.round(scale * 100)}%</span>
            {scale > 1 && (
              <span className="text-muted-foreground">• Перетаскивайте для перемещения</span>
            )}
          </div>

          <div 
            className={`w-full h-[70vh] flex items-center justify-center overflow-hidden ${
              scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
            } ${isDragging ? 'cursor-grabbing' : ''}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {isLoading && !imageError && (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-3 text-muted-foreground">Загрузка изображения...</span>
              </div>
            )}
            
            {imageError && (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ошибка загрузки</h3>
                <p className="text-muted-foreground mb-4">
                  Не удалось загрузить изображение документа
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setImageError(false);
                    setIsLoading(true);
                    // Retry loading
                    const img = new Image();
                    img.onload = () => setIsLoading(false);
                    img.onerror = () => setImageError(true);
                    img.src = signedUrl;
                  }}
                >
                  Повторить попытку
                </Button>
              </div>
            )}

            {signedUrl && !imageError && (
              <motion.img
                ref={imageRef}
                src={signedUrl}
                alt={getDocumentTitle()}
                className="w-full h-full object-contain select-none"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  display: isLoading ? 'none' : 'block'
                }}
                draggable={false}
                onLoad={() => {
                  setIsLoading(false);
                  setImageError(false);
                  // Reset position when image loads
                  setPosition({ x: 0, y: 0 });
                  setScale(1);
                }}
                onError={() => {
                  setIsLoading(false);
                  setImageError(true);
                  console.error('Failed to load image:', signedUrl);
                }}
              />
            )}
          </div>

          {/* Zoom controls overlay for mobile */}
          <div className="absolute bottom-4 right-4 flex gap-2 md:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 5}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 border-t bg-muted/5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Тип: {getDocumentTitle()}</span>
              {fileName && <span>Файл: {fileName}</span>}
            </div>
            <div className="flex items-center gap-4">
              <span>Колесо мыши для масштаба</span>
              <span>Клик и перетаскивание для перемещения</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};