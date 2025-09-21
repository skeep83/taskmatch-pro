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
      const maxSize = 400;
      const aspectRatio = img.width / img.height;
      
      let canvasWidth, canvasHeight;
      if (aspectRatio > 1) {
        canvasWidth = Math.min(maxSize, img.width);
        canvasHeight = canvasWidth / aspectRatio;
      } else {
        canvasHeight = Math.min(maxSize, img.height);
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      setCanvasSize({ width: canvasWidth, height: canvasHeight });
      
      // Set initial crop area to center square
      const size = Math.min(canvasWidth, canvasHeight) * 0.6;
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

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height);

    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw crop border
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw corner handles
    const handleSize = 12;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

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
    const handleSize = 12;
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
      // Simple resize from bottom-right corner
      const newWidth = Math.max(50, Math.min(pos.x - cropArea.x, canvasSize.width - cropArea.x));
      const newHeight = Math.max(50, Math.min(pos.y - cropArea.y, canvasSize.height - cropArea.y));
      
      // Keep square aspect ratio
      const size = Math.min(newWidth, newHeight);
      setCropArea(prev => ({ ...prev, width: size, height: size }));
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

  const handleCrop = useCallback(async () => {
    if (!image || !canvasRef.current) return;

    // Create a temporary canvas for cropping
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Set output size (square for avatar)
    const outputSize = 300;
    tempCanvas.width = outputSize;
    tempCanvas.height = outputSize;

    // Calculate scale factors
    const scaleX = image.width / canvasSize.width;
    const scaleY = image.height / canvasSize.height;

    // Draw cropped image
    tempCtx.drawImage(
      image,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to blob
    tempCanvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.9);
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
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="border border-gray-200 rounded-lg cursor-crosshair max-w-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Перетащите область кадрирования или измените её размер
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
