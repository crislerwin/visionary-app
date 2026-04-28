"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import { Eye, Image as ImageIcon, Loader2, Palette, Phone, Store } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

interface ColorPickerButtonProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

function ColorPickerButton({ color, onChange, label }: ColorPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full rounded-md border px-3 py-2 bg-background hover:bg-accent transition-colors"
        >
          <div
            className="h-6 w-6 rounded-full border shadow-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-mono uppercase flex-1 text-left">{color}</span>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 p-3 bg-background border rounded-lg shadow-lg space-y-2 w-[240px]">
            <HexColorPicker
              color={color}
              onChange={onChange}
              style={{ width: "100%", height: "120px" }}
            />
            <Input
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 text-xs font-mono uppercase"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrandingSettingsPage() {
  const { currentTenant, isLoading: isLoadingTenant } = useCurrentTenant();
  const utils = api.useUtils();

  const { data: config, isLoading: isLoadingConfig } = api.tenant.getConfig.useQuery(undefined, {
    enabled: !!currentTenant?.id,
  });

  const updateTenant = api.tenant.update.useMutation({
    onSuccess: () => {
      utils.tenant.list.invalidate();
    },
  });

  const updateConfig = api.tenant.updateConfig.useMutation({
    onSuccess: () => {
      utils.tenant.getConfig.invalidate();
    },
  });

  // Tenant fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [imageUrl, setImageUrl] = useState(currentTenant?.image ?? "");

  // Branding fields
  const [primaryColor, setPrimaryColor] = useState(config?.branding?.colors?.primary ?? "#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState(
    config?.branding?.colors?.secondary ?? "#10b981",
  );
  const [backgroundColor, setBackgroundColor] = useState(
    config?.branding?.colors?.background ?? "#ffffff",
  );
  const [textColor, setTextColor] = useState(config?.branding?.colors?.text ?? "#1f2937");
  const [primaryTextColor, setPrimaryTextColor] = useState(
    config?.branding?.colors?.primaryText ?? "#ffffff",
  );
  const [secondaryTextColor, setSecondaryTextColor] = useState(
    config?.branding?.colors?.secondaryText ?? "#ffffff",
  );

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Only initialize from server data once on mount, don't overwrite user changes
  const initialized = useRef(false);
  useEffect(() => {
    if (currentTenant && !initialized.current) {
      initialized.current = true;
      setName(currentTenant.name);
      setSlug(currentTenant.slug);
      setDescription(currentTenant.description ?? "");
      setWhatsappPhone(currentTenant.whatsappPhone ?? "");
      setImageUrl(currentTenant.image ?? "");
    }
  }, [currentTenant]);

  useEffect(() => {
    if (config && !initialized.current) {
      setPrimaryColor(config.branding?.colors?.primary ?? "#3b82f6");
      setSecondaryColor(config.branding?.colors?.secondary ?? "#10b981");
      setBackgroundColor(config.branding?.colors?.background ?? "#ffffff");
      setTextColor(config.branding?.colors?.text ?? "#1f2937");
      setPrimaryTextColor(config.branding?.colors?.primaryText ?? "#ffffff");
      setSecondaryTextColor(config.branding?.colors?.secondaryText ?? "#ffffff");
    }
  }, [config]);

  const handleSaveTenant = async () => {
    if (!currentTenant) return;
    await updateTenant.mutateAsync({
      id: currentTenant.id,
      name: name || undefined,
      slug: slug || undefined,
      description: description || null,
      whatsappPhone: whatsappPhone || null,
      image: imageUrl || null,
    });
  };

  const handleSaveBranding = async () => {
    await updateConfig.mutateAsync({
      branding: {
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          background: backgroundColor,
          text: textColor,
          primaryText: primaryTextColor,
          secondaryText: secondaryTextColor,
        },
      },
    });
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !currentTenant) return;

    setIsUploading(true);
    try {
      const compressedFile = await import("browser-image-compression").then((mod) =>
        mod.default(selectedFile, { maxSizeMB: 0.5, maxWidthOrHeight: 512, useWebWorker: true }),
      );

      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();
      setImageUrl(url);
      setSelectedFile(null);

      // Auto-save the uploaded image to the tenant
      await updateTenant.mutateAsync({
        id: currentTenant.id,
        image: url,
      });
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, currentTenant, updateTenant]);

  if (isLoadingTenant || isLoadingConfig) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (!currentTenant) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum estabelecimento selecionado</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <PageHeader
          title="Configurações de Marca"
          description="Personalize a identidade visual e os dados do seu estabelecimento"
        />

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              <Store className="mr-2 h-4 w-4" />
              Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="mr-2 h-4 w-4" />
              Cores e Logo
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Estabelecimento</CardTitle>
                <CardDescription>
                  Informações básicas que aparecem no cardápio e nos pedidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome do estabelecimento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL do cardápio)</Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="meu-restaurante"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição curta do estabelecimento"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="whatsapp"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveTenant} disabled={updateTenant.isPending} size="lg">
                {updateTenant.isPending ? "Salvando..." : "Salvar dados"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            {/* Logo Section */}
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>Faça upload da logo do seu estabelecimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="relative h-32 w-32 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt="Logo preview"
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" onChange={handleFileSelect} />
                    {selectedFile && (
                      <Button onClick={handleUpload} disabled={isUploading} size="sm">
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Fazer upload"
                        )}
                      </Button>
                    )}
                    {imageUrl && (
                      <Button variant="outline" onClick={() => setImageUrl("")} size="sm">
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Colors Section */}
            <Card>
              <CardHeader>
                <CardTitle>Cores da Marca</CardTitle>
                <CardDescription>Personalize as cores do seu cardápio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <ColorPickerButton
                    label="Cor Primária"
                    color={primaryColor}
                    onChange={setPrimaryColor}
                  />
                  <ColorPickerButton
                    label="Cor Secundária"
                    color={secondaryColor}
                    onChange={setSecondaryColor}
                  />
                  <ColorPickerButton
                    label="Cor de Fundo"
                    color={backgroundColor}
                    onChange={setBackgroundColor}
                  />
                  <ColorPickerButton
                    label="Cor do Texto"
                    color={textColor}
                    onChange={setTextColor}
                  />
                  <ColorPickerButton
                    label="Texto Primário"
                    color={primaryTextColor}
                    onChange={setPrimaryTextColor}
                  />
                  <ColorPickerButton
                    label="Texto Secundário"
                    color={secondaryTextColor}
                    onChange={setSecondaryTextColor}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveBranding} disabled={updateConfig.isPending} size="lg">
                {updateConfig.isPending ? "Salvando..." : "Salvar branding"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Preview do Cardápio</CardTitle>
                <CardDescription>Veja como seu cardápio ficará</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-lg border p-6 space-y-6"
                  style={
                    {
                      backgroundColor,
                      color: textColor,
                    } as React.CSSProperties
                  }
                >
                  {/* Header simulado */}
                  <div
                    className="flex items-center gap-3 p-4 rounded-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {imageUrl ? (
                      <div className="relative h-12 w-12">
                        <Image
                          src={imageUrl}
                          alt="Logo"
                          fill
                          className="object-contain rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-bold">{name || "Nome do Estabelecimento"}</h3>
                      {description && <p className="text-white/80 text-sm">{description}</p>}
                    </div>
                  </div>

                  {/* Botão simulado */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg"
                      style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                    >
                      Botão Primário
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg"
                      style={{ backgroundColor: secondaryColor, color: secondaryTextColor }}
                    >
                      Botão Secundário
                    </button>
                  </div>

                  {/* Cards simulados */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg border" style={{ color: textColor }}>
                      <h4 className="font-medium" style={{ color: primaryColor }}>
                        Categoria Destaque
                      </h4>
                      <p className="text-sm opacity-70">Descrição com a cor primária no título</p>
                    </div>
                    <div className="p-4 rounded-lg border" style={{ color: textColor }}>
                      <h4 className="font-medium" style={{ color: secondaryColor }}>
                        Promoção
                      </h4>
                      <p className="text-sm opacity-70">Descrição com a cor secundária no título</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
