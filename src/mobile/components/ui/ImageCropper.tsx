import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crop, RotateCcw, Check, X } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedBlob: Blob) => void;
  imageFile: File;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropper({ isOpen, onClose, onCrop, imageFile }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    img.onload = () => {
      setImage(img);
      
      // Calculate canvas size to fit image while maintaining aspect ratio
      const maxSize = 350;
      const aspectRatio = img.width / img.height;
      
      let canvasWidth, canvasHeight;
      if (aspectRatio > 1) {
        // Landscape
        canvasWidth = Math.min(maxSize, img.width);
        canvasHeight = canvasWidth / aspectRatio;
      } else {
        // Portrait or square
        canvasHeight = Math.min(maxSize, img.height);
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      setCanvasSize({ width: canvasWidth, height: canvasHeight });
      
      // Set initial crop area to center square (80% of smaller dimension)
      const minDimension = Math.min(canvasWidth, canvasHeight);
      const size = minDimension * 0.8;
      setCropArea({
        x: (canvasWidth - size) / 2,
        y: (canvasHeight - size) / 2,
        width: size,
        height: size
      });
    };

    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  // Draw on canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas display size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image to fill canvas while maintaining aspect ratio
    ctx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height);

    // Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area (punch hole effect)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw corner handles
    const handleSize = 16;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;

    const corners = [
      { x: cropArea.x - handleSize / 2, y: cropArea.y - handleSize / 2 },
      { x: cropArea.x + cropArea.width - handleSize / 2, y: cropArea.y - handleSize / 2 },
      { x: cropArea.x - handleSize / 2, y: cropArea.y + cropArea.height - handleSize / 2 },
      { x: cropArea.x + cropArea.width - handleSize / 2, y: cropArea.y + cropArea.height - handleSize / 2 }
    ];

    corners.forEach(corner => {
      ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
      ctx.strokeRect(corner.x, corner.y, handleSize, handleSize);
    });

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Vertical lines
    for (let i = 1; i < 3; i++) {
      const x = cropArea.x + (cropArea.width / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x, cropArea.y);
      ctx.lineTo(x, cropArea.y + cropArea.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 1; i < 3; i++) {
      const y = cropArea.y + (cropArea.height / 3) * i;
      ctx.beginPath();
      ctx.moveTo(cropArea.x, y);
      ctx.lineTo(cropArea.x + cropArea.width, y);
      ctx.stroke();
    }

  }, [image, cropArea, canvasSize]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const isInCropArea = useCallback((x: number, y: number) => {
    return x >= cropArea.x && x <= cropArea.x + cropArea.width &&
           y >= cropArea.y && y <= cropArea.y + cropArea.height;
  }, [cropArea]);

  const isOnHandle = useCallback((x: number, y: number) => {
    const handleSize = 16;
    const handles = [
      { x: cropArea.x - handleSize / 2, y: cropArea.y - handleSize / 2, type: 'nw' },
      { x: cropArea.x + cropArea.width - handleSize / 2, y: cropArea.y - handleSize / 2, type: 'ne' },
      { x: cropArea.x - handleSize / 2, y: cropArea.y + cropArea.height - handleSize / 2, type: 'sw' },
      { x: cropArea.x + cropArea.width - handleSize / 2, y: cropArea.y + cropArea.height - handleSize / 2, type: 'se' }
    ];

    for (const handle of handles) {
      if (x >= handle.x && x <= handle.x + handleSize &&
          y >= handle.y && y <= handle.y + handleSize) {
        return handle.type;
      }
    }
    return null;
  }, [cropArea]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const handleType = isOnHandle(pos.x, pos.y);

    if (handleType) {
      setIsResizing(true);
      setDragStart({ x: pos.x, y: pos.y });
    } else if (isInCropArea(pos.x, pos.y)) {
      setIsDragging(true);
      setDragStart({ x: pos.x - cropArea.x, y: pos.y - cropArea.y });
    }
  }, [getMousePos, isOnHandle, isInCropArea, cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (isDragging) {
      const newX = Math.max(0, Math.min(pos.x - dragStart.x, canvasSize.width - cropArea.width));
      const newY = Math.max(0, Math.min(pos.y - dragStart.y, canvasSize.height - cropArea.height));
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      // Resize while maintaining square aspect ratio
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;
      const delta = Math.max(deltaX, deltaY);
      
      const newSize = Math.max(50, Math.min(
        cropArea.width + delta,
        Math.min(canvasSize.width - cropArea.x, canvasSize.height - cropArea.y)
      ));
      
      setCropArea(prev => ({ ...prev, width: newSize, height: newSize }));
      setDragStart({ x: pos.x, y: pos.y });
    }

    // Update cursor
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isOnHandle(pos.x, pos.y)) {
      canvas.style.cursor = 'nw-resize';
    } else if (isInCropArea(pos.x, pos.y)) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'default';
    }
  }, [getMousePos, isDragging, isResizing, dragStart, cropArea, canvasSize, isOnHandle, isInCropArea]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    const handleType = isOnHandle(pos.x, pos.y);

    if (handleType) {
      setIsResizing(true);
      setDragStart({ x: pos.x, y: pos.y });
    } else if (isInCropArea(pos.x, pos.y)) {
      setIsDragging(true);
      setDragStart({ x: pos.x - cropArea.x, y: pos.y - cropArea.y });
    }
  }, [isOnHandle, isInCropArea, cropArea]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    if (isDragging) {
      const newX = Math.max(0, Math.min(pos.x - dragStart.x, canvasSize.width - cropArea.width));
      const newY = Math.max(0, Math.min(pos.y - dragStart.y, canvasSize.height - cropArea.height));
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;
      const delta = Math.max(deltaX, deltaY);
      
      const newSize = Math.max(50, Math.min(
        cropArea.width + delta,
        Math.min(canvasSize.width - cropArea.x, canvasSize.height - cropArea.y)
      ));
      
      setCropArea(prev => ({ ...prev, width: newSize, height: newSize }));
      setDragStart({ x: pos.x, y: pos.y });
    }
  }, [isDragging, isResizing, dragStart, cropArea, canvasSize]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!image || !canvasRef.current) return;

    // Create a temporary canvas for cropping
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Set output size (square for avatar) - higher resolution
    const outputSize = 400;
    tempCanvas.width = outputSize;
    tempCanvas.height = outputSize;

    // Calculate scale factors from canvas to original image
    const scaleX = image.width / canvasSize.width;
    const scaleY = image.height / canvasSize.height;

    // Calculate source rectangle in original image coordinates
    const sourceX = cropArea.x * scaleX;
    const sourceY = cropArea.y * scaleY;
    const sourceWidth = cropArea.width * scaleX;
    const sourceHeight = cropArea.height * scaleY;

    // Draw cropped and scaled image
    tempCtx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to blob with high quality
    tempCanvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.95);
  }, [image, cropArea, canvasSize, onCrop]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Кадрирование аватара
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center bg-gray-50 rounded-lg p-4">
            <canvas
              ref={canvasRef}
              className="border border-gray-200 rounded-lg cursor-crosshair max-w-full shadow-sm"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Перетащите рамку или углы для изменения области кадрирования
            </p>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Отмена
              </Button>

              <Button
                onClick={handleCrop}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              >
                <Check className="h-4 w-4" />
                Применить
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
