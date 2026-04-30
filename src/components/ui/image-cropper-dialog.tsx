"use client";

import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";
import { useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  makeAspectCrop,
  type PixelCrop,
  centerCrop,
  convertToPixelCrop,
} from "react-image-crop";

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCrop: (croppedFile: File) => void;
  aspectRatio?: number;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  onCrop,
  aspectRatio = 4 / 3,
}: ImageCropperDialogProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const newCrop = centerAspectCrop(width, height, aspectRatio);
    setCrop(newCrop);
    setCompletedCrop(convertToPixelCrop(newCrop, width, height));
  }

  async function handleCrop() {
    const image = imgRef.current;
    const pixelCrop = completedCrop;

    if (!image || !pixelCrop) return;

    setIsProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const rawWidth = pixelCrop.width * scaleX;
      const rawHeight = pixelCrop.height * scaleY;

      // Scale up to a max dimension of 1600px for better quality
      const MAX_SIZE = 1600;
      let outputWidth = rawWidth;
      let outputHeight = rawHeight;

      if (rawWidth > MAX_SIZE || rawHeight > MAX_SIZE) {
        if (rawWidth > rawHeight) {
          outputWidth = MAX_SIZE;
          outputHeight = (rawHeight / rawWidth) * MAX_SIZE;
        } else {
          outputHeight = MAX_SIZE;
          outputWidth = (rawWidth / rawHeight) * MAX_SIZE;
        }
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        rawWidth,
        rawHeight,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "cropped-image.jpg", {
              type: "image/jpeg",
            });
            onCrop(file);
            onOpenChange(false);
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        0.92,
      );
    } catch (error) {
      logger.error({ error }, "Crop error");
      setIsProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Recortar Imagem</DialogTitle>
          <DialogDescription>Ajuste a área da imagem que será usada no produto</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 px-6">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              keepSelection
              className="max-h-full"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                onLoad={onImageLoad}
                className="max-h-[55vh] w-auto object-contain"
              />
            </ReactCrop>
          )}
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleCrop} disabled={isProcessing || !completedCrop}>
            {isProcessing ? "Processando..." : "Confirmar Recorte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
