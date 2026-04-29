"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { MenuPreview } from "@/components/menu/menu-preview";
import {
  type BusinessHours,
  BusinessHoursEditor,
  type DayKey,
} from "@/components/settings/business-hours-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import {
  Clock,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Share2,
  Star,
  Store,
} from "lucide-react";
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

  // Social fields
  const [instagram, setInstagram] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [googleStars, setGoogleStars] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [address, setAddress] = useState("");
  const [externalOrderUrl, setExternalOrderUrl] = useState("");

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

  // Business hours
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

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
      setInstagram(config.social?.instagram ?? "");
      setGoogleMapsUrl(config.social?.googleMapsUrl ?? "");
      setGoogleStars(config.social?.googleStars?.toString() ?? "");
      setDeliveryTime(config.social?.deliveryTime ?? "");
      setAddress(config.social?.address ?? "");
      setExternalOrderUrl(config.social?.externalOrderUrl ?? "");
      setBusinessHours((config.businessHours as BusinessHours) ?? {});
      setTimezone((config.timezone as string) ?? "America/Sao_Paulo");
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

  const handleSaveSocial = async () => {
    await updateConfig.mutateAsync({
      social: {
        instagram: instagram || undefined,
        googleMapsUrl: googleMapsUrl || undefined,
        googleStars: googleStars ? Number.parseFloat(googleStars) : undefined,
        deliveryTime: deliveryTime || undefined,
        address: address || undefined,
        externalOrderUrl: externalOrderUrl || undefined,
      },
    });
  };

  const handleSaveHours = async () => {
    const stripped: BusinessHours = {};
    for (const [day, shifts] of Object.entries(businessHours)) {
      if (shifts && shifts.length > 0) {
        stripped[day as DayKey] = shifts.map(({ open, close }) => ({ open, close }));
      }
    }
    await updateConfig.mutateAsync({
      businessHours: Object.keys(stripped).length > 0 ? stripped : undefined,
      timezone: timezone || undefined,
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
          <TabsList className="h-auto flex-wrap w-full justify-start gap-1">
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              <Store className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Dados Gerais</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="text-xs sm:text-sm">
              <Palette className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cores e Logo</span>
              <span className="sm:hidden">Cores</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs sm:text-sm">
              <Share2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Social e Contato</span>
              <span className="sm:hidden">Social</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="text-xs sm:text-sm">
              <Clock className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Horários</span>
              <span className="sm:hidden">Horas</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs sm:text-sm">
              <Eye className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
              <Button
                onClick={handleSaveTenant}
                disabled={updateTenant.isPending}
                size="lg"
                className="w-full sm:w-auto"
              >
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-lg border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt="Logo preview"
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2 w-full sm:w-auto">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="text-xs sm:text-sm"
                    />
                    {selectedFile && (
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
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
                      <Button
                        variant="outline"
                        onClick={() => setImageUrl("")}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
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
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
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
              <Button
                onClick={handleSaveBranding}
                disabled={updateConfig.isPending}
                size="lg"
                className="w-full sm:w-auto"
              >
                {updateConfig.isPending ? "Salvando..." : "Salvar branding"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Redes Sociais e Contato</CardTitle>
                <CardDescription>
                  Configure os links e informações que aparecerão no cardápio público
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@meurestaurante"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="google-maps">Google Maps</Label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="google-maps"
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        placeholder="https://g.page/..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google-stars">Nota Google (0–5)</Label>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="google-stars"
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={googleStars}
                        onChange={(e) => setGoogleStars(e.target.value)}
                        placeholder="4.8"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-time">Tempo de Entrega</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="delivery-time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        placeholder="20-35 min"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço curto</Label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua das Flores, 123"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="external-order">Link de pedido externo</Label>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="external-order"
                      value={externalOrderUrl}
                      onChange={(e) => setExternalOrderUrl(e.target.value)}
                      placeholder="https://ifood.com.br/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveSocial}
                disabled={updateConfig.isPending}
                size="lg"
                className="w-full sm:w-auto"
              >
                {updateConfig.isPending ? "Salvando..." : "Salvar social e contato"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Horário de Funcionamento</CardTitle>
                <CardDescription>
                  Configure os horários de abertura e fechamento do seu estabelecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso horário</Label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="America/Sao_Paulo">América/São Paulo (BRT)</option>
                    <option value="America/Fortaleza">América/Fortaleza (BRT)</option>
                    <option value="America/Manaus">América/Manaus (AMT)</option>
                    <option value="America/Cuiaba">América/Cuiabá (AMT)</option>
                    <option value="America/Belem">América/Belém (BRT)</option>
                    <option value="America/Recife">América/Recife (BRT)</option>
                    <option value="America/Bahia">América/Bahia (BRT)</option>
                    <option value="America/Noronha">América/Noronha (FNT)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveHours}
                disabled={updateConfig.isPending}
                size="lg"
                className="w-full sm:w-auto"
              >
                {updateConfig.isPending ? "Salvando..." : "Salvar horários"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle>Preview do Cardápio</CardTitle>
                <CardDescription>
                  Veja como seu cardápio ficará no celular do cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="max-w-xs sm:max-w-sm mx-auto">
                  <MenuPreview
                    name={name}
                    description={description}
                    imageUrl={imageUrl}
                    colors={{
                      primary: primaryColor,
                      secondary: secondaryColor,
                      background: backgroundColor,
                      text: textColor,
                      primaryText: primaryTextColor,
                      secondaryText: secondaryTextColor,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
