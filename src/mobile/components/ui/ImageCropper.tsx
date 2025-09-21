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

    // Create circular crop area (punch hole effect)
    const centerX = cropArea.x + cropArea.width / 2;
    const centerY = cropArea.y + cropArea.height / 2;
    const radius = cropArea.width / 2;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Draw circular border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw resize handles (4 cardinal points)
    const handleSize = 20;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;

    const handles = [
      { x: centerX, y: centerY - radius }, // top
      { x: centerX + radius, y: centerY }, // right
      { x: centerX, y: centerY + radius }, // bottom
      { x: centerX - radius, y: centerY }, // left
    ];

    handles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // Draw center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius + 10);
    ctx.lineTo(centerX, centerY + radius - 10);
    ctx.stroke();
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - radius + 10, centerY);
    ctx.lineTo(centerX + radius - 10, centerY);
    ctx.stroke();

  }, [image, cropArea, canvasSize]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const isInCropArea = useCallback((x: number, y: number) => {
    const centerX = cropArea.x + cropArea.width / 2;
    const centerY = cropArea.y + cropArea.height / 2;
    const radius = cropArea.width / 2;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    return distance <= radius;
  }, [cropArea]);

  const isOnHandle = useCallback((x: number, y: number) => {
    const handleSize = 20;
    const centerX = cropArea.x + cropArea.width / 2;
    const centerY = cropArea.y + cropArea.height / 2;
    const radius = cropArea.width / 2;
    
    const handles = [
      { x: centerX, y: centerY - radius, type: 'n' },
      { x: centerX + radius, y: centerY, type: 'e' },
      { x: centerX, y: centerY + radius, type: 's' },
      { x: centerX - radius, y: centerY, type: 'w' }
    ];

    for (const handle of handles) {
      const distance = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (distance <= handleSize / 2) {
        return handle.type;
      }
    }
    return null;
  }, [cropArea]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getMousePos(e);
    const handleType = isOnHandle(pos.x, pos.y);

    if (handleType) {
      setIsResizing(true);
      setDragStart({ x: pos.x, y: pos.y });
    } else if (isInCropArea(pos.x, pos.y)) {
      setIsDragging(true);
      // Сохраняем смещение мыши относительно центра круга
      const centerX = cropArea.x + cropArea.width / 2;
      const centerY = cropArea.y + cropArea.height / 2;
      setDragStart({ x: pos.x - centerX, y: pos.y - centerY });
    }
  }, [getMousePos, isOnHandle, isInCropArea, cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (isDragging) {
      const newCenterX = pos.x - dragStart.x;
      const newCenterY = pos.y - dragStart.y;
      const radius = cropArea.width / 2;
      
      // Ensure crop area stays within canvas bounds with proper margin
      const minX = radius;
      const maxX = canvasSize.width - radius;
      const minY = radius;
      const maxY = canvasSize.height - radius;
      
      const constrainedCenterX = Math.max(minX, Math.min(maxX, newCenterX));
      const constrainedCenterY = Math.max(minY, Math.min(maxY, newCenterY));
      
      const newX = constrainedCenterX - radius;
      const newY = constrainedCenterY - radius;
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      const centerX = cropArea.x + cropArea.width / 2;
      const centerY = cropArea.y + cropArea.height / 2;
      
      // Calculate distance from center to mouse position
      const distance = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
      
      // Calculate maximum radius based on distance to nearest edge
      const maxRadiusX = Math.min(centerX, canvasSize.width - centerX);
      const maxRadiusY = Math.min(centerY, canvasSize.height - centerY);
      const maxRadius = Math.min(maxRadiusX, maxRadiusY);
      
      const newRadius = Math.max(25, Math.min(distance, maxRadius));
      const newSize = newRadius * 2;
      const newX = centerX - newRadius;
      const newY = centerY - newRadius;
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY, width: newSize, height: newSize }));
    }

    // Update cursor
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isOnHandle(pos.x, pos.y)) {
      canvas.style.cursor = 'pointer';
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
  const getTouchPos = useCallback((touch: React.Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getTouchPos(touch);

    const handleType = isOnHandle(pos.x, pos.y);

    if (handleType) {
      setIsResizing(true);
      setDragStart({ x: pos.x, y: pos.y });
    } else if (isInCropArea(pos.x, pos.y)) {
      setIsDragging(true);
      // Сохраняем смещение касания относительно центра круга
      const centerX = cropArea.x + cropArea.width / 2;
      const centerY = cropArea.y + cropArea.height / 2;
      setDragStart({ x: pos.x - centerX, y: pos.y - centerY });
    }
  }, [getTouchPos, isOnHandle, isInCropArea, cropArea]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getTouchPos(touch);

    if (isDragging) {
      const newCenterX = pos.x - dragStart.x;
      const newCenterY = pos.y - dragStart.y;
      const radius = cropArea.width / 2;
      
      // Ensure crop area stays within canvas bounds with proper margin
      const minX = radius;
      const maxX = canvasSize.width - radius;
      const minY = radius;
      const maxY = canvasSize.height - radius;
      
      const constrainedCenterX = Math.max(minX, Math.min(maxX, newCenterX));
      const constrainedCenterY = Math.max(minY, Math.min(maxY, newCenterY));
      
      const newX = constrainedCenterX - radius;
      const newY = constrainedCenterY - radius;
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      const centerX = cropArea.x + cropArea.width / 2;
      const centerY = cropArea.y + cropArea.height / 2;
      
      // Calculate distance from center to touch position
      const distance = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
      
      // Calculate maximum radius based on distance to nearest edge
      const maxRadiusX = Math.min(centerX, canvasSize.width - centerX);
      const maxRadiusY = Math.min(centerY, canvasSize.height - centerY);
      const maxRadius = Math.min(maxRadiusX, maxRadiusY);
      
      const newRadius = Math.max(25, Math.min(distance, maxRadius));
      const newSize = newRadius * 2;
      const newX = centerX - newRadius;
      const newY = centerY - newRadius;
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY, width: newSize, height: newSize }));
    }
  }, [getTouchPos, isDragging, isResizing, dragStart, cropArea, canvasSize]);

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

    // Make background transparent
    tempCtx.clearRect(0, 0, outputSize, outputSize);

    // Calculate scale factors from canvas to original image
    const scaleX = image.width / canvasSize.width;
    const scaleY = image.height / canvasSize.height;

    // Calculate source rectangle in original image coordinates
    const sourceX = cropArea.x * scaleX;
    const sourceY = cropArea.y * scaleY;
    const sourceWidth = cropArea.width * scaleX;
    const sourceHeight = cropArea.height * scaleY;

    // Create circular clipping path FIRST
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;
    const radius = outputSize / 2;

    tempCtx.save();
    tempCtx.beginPath();
    tempCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    tempCtx.closePath();
    tempCtx.clip();

    // Draw cropped and scaled image within the circular clip
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

    tempCtx.restore();

    // Convert to blob with PNG format to preserve transparency
    tempCanvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/png', 1.0);
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
              Перетащите круг или измените размер для кадрирования
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
