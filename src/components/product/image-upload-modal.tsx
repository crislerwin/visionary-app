"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";
import imageCompression from "browser-image-compression";
import { useState } from "react";
import { Cropper } from "react-cropper";

interface ImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (croppedFile: File) => Promise<void>;
  aspectRatio?: number;
}

export function ImageUploadModal({
  open,
  onOpenChange,
  onUpload,
  aspectRatio = 1,
}: ImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropper, setCropper] = useState<Cropper | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Compress before showing cropper
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      setSelectedFile(compressedFile);
      const objectUrl = URL.createObjectURL(compressedFile);
      setPreview(objectUrl);
    } catch (error) {
      logger.error({ error }, "Error compressing image");
    }
  };

  const handleUpload = async () => {
    if (!cropper || !selectedFile) return;

    setIsUploading(true);
    try {
      const canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 600,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
      });

      const croppedFile = new File([blob], selectedFile.name, {
        type: "image/jpeg",
      });

      await onUpload(croppedFile);
      handleClose();
    } catch (error) {
      logger.error({ error }, "Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Imagem do Produto</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground text-center">
              Formatos suportados: JPG, PNG, WebP (máx. 5MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-[400px]">
              <Cropper
                src={preview}
                style={{ height: "100%", width: "100%" }}
                aspectRatio={aspectRatio}
                guides={true}
                viewMode={1}
                dragMode="move"
                scalable={true}
                zoomable={true}
                onInitialized={(instance) => setCropper(instance)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)} disabled={isUploading}>
                Escolher outra
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Salvando..." : "Salvar Imagem"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
