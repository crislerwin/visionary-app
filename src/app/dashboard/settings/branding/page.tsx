"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { MenuPreview } from "@/components/menu/menu-preview";
import {
  type BusinessHours,
  BusinessHoursEditor,
  type DayKey,
} from "@/components/settings/business-hours-editor";
import {
  CheckoutConfigEditor,
  type CustomerForm,
  type PaymentOptions,
} from "@/components/settings/checkout-config-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { api } from "@/lib/trpc/react";
import {
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Palette,
  Phone,
  QrCode,
  Share2,
  Star,
  Store,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 w-full rounded-md border px-2 py-1.5 bg-background hover:bg-accent transition-colors"
        >
          <div
            className="h-4 w-4 rounded-full border shadow-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-mono uppercase flex-1 text-left">{color}</span>
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
  const { toast } = useToast();
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
      utils.tenant.list.invalidate();
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

  // Checkout config
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions>({});
  const [customerForm, setCustomerForm] = useState<CustomerForm>({});
  const [deliveryFee, setDeliveryFee] = useState<string>("");

  // Banner upload state
  const [isUploading, setIsUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only initialize from server data once per tenant, don't overwrite user changes
  const tenantInitialized = useRef(false);
  const configInitialized = useRef(false);
  const lastTenantId = useRef<string | null>(null);

  useEffect(() => {
    if (currentTenant?.id !== lastTenantId.current) {
      lastTenantId.current = currentTenant?.id ?? null;
      tenantInitialized.current = false;
      configInitialized.current = false;
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    if (currentTenant && !tenantInitialized.current) {
      tenantInitialized.current = true;
      setName(currentTenant.name);
      setSlug(currentTenant.slug);
      setDescription(currentTenant.description ?? "");
      setWhatsappPhone(currentTenant.whatsappPhone ?? "");
      setImageUrl(currentTenant.image ?? "");
    }
  }, [currentTenant]);

  useEffect(() => {
    if (config && !configInitialized.current) {
      configInitialized.current = true;
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
      setPaymentOptions((config.paymentOptions as PaymentOptions) ?? {});
      setCustomerForm((config.customerForm as CustomerForm) ?? {});
      setDeliveryFee(config.deliveryFee?.toString() ?? "");
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

  const handleSaveCheckout = async () => {
    try {
      await updateConfig.mutateAsync({
        paymentOptions: Object.keys(paymentOptions).length > 0 ? paymentOptions : undefined,
        customerForm: Object.keys(customerForm).length > 0 ? customerForm : undefined,
        deliveryFee: deliveryFee ? Number.parseFloat(deliveryFee) : undefined,
      });
      toast({
        title: "Configurações salvas",
        description: "As configurações de checkout foram atualizadas com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações de checkout.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!currentTenant?.id) return;

      setIsUploading(true);
      try {
        const compressedFile = await import("browser-image-compression").then((mod) =>
          mod.default(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }),
        );

        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("tenantId", currentTenant.id);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { url } = await response.json();
        setImageUrl(url);

        // Auto-save the uploaded image to the tenant
        await updateTenant.mutateAsync({
          id: currentTenant.id,
          image: url,
        });
      } catch (error) {
        logger.error({ error }, "Upload error");
      } finally {
        setIsUploading(false);
      }
    },
    [currentTenant, updateTenant],
  );

  const handleCropComplete = useCallback(
    (croppedFile: File) => {
      void handleUpload(croppedFile);
    },
    [handleUpload],
  );

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
            <TabsTrigger value="checkout" className="text-xs sm:text-sm">
              <CreditCard className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Checkout</span>
              <span className="sm:hidden">Pagto</span>
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="text-xs sm:text-sm">
              <QrCode className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">QR Code</span>
              <span className="sm:hidden">QR</span>
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
            {/* Banner Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Banner</CardTitle>
                <CardDescription>Faça upload do banner do seu estabelecimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {/* Banner Preview */}
                <div className="relative w-full h-28 sm:h-36 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Banner preview"
                      className="absolute inset-0 h-full w-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                      <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                      <span className="text-xs sm:text-sm">Nenhum banner selecionado</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Escolher imagem
                      </>
                    )}
                  </Button>
                  {imageUrl && (
                    <Button variant="outline" onClick={() => setImageUrl("")} size="sm">
                      Remover
                    </Button>
                  )}
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
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
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

          <TabsContent value="checkout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Checkout</CardTitle>
                <CardDescription>
                  Personalize os métodos de pagamento e os campos do formulário de checkout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CheckoutConfigEditor
                  paymentOptions={paymentOptions}
                  onPaymentOptionsChange={setPaymentOptions}
                  customerForm={customerForm}
                  onCustomerFormChange={setCustomerForm}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Entrega</CardTitle>
                <CardDescription>Valor cobrado para pedidos do tipo delivery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="delivery-fee">Valor da taxa (R$)</Label>
                  <Input
                    id="delivery-fee"
                    type="number"
                    min={0}
                    step={0.01}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveCheckout}
                disabled={updateConfig.isPending}
                size="lg"
                className="w-full sm:w-auto"
              >
                {updateConfig.isPending ? "Salvando..." : "Salvar checkout"}
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

          <TabsContent value="qrcode" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>QR Code do Cardápio</CardTitle>
                <CardDescription>
                  Gere o QR Code para seus clientes acessarem o cardápio digital
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {slug ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="rounded-xl border bg-white p-6">
                      <QRCodeSVG
                        id="menu-qrcode"
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/menu/${slug}`}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Escaneie para acessar:{" "}
                        <span className="font-medium text-foreground">/menu/{slug}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tamanho recomendado para impressão: 10cm x 10cm
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        const svg = document.getElementById("menu-qrcode");
                        if (!svg) return;
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const img = document.createElement("img");
                        img.onload = () => {
                          canvas.width = 1024;
                          canvas.height = 1024;
                          ctx?.drawImage(img, 0, 0, 1024, 1024);
                          const link = document.createElement("a");
                          link.download = `qrcode-cardapio-${slug}.png`;
                          link.href = canvas.toDataURL("image/png");
                          link.click();
                        };
                        img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
                      }}
                    >
                      Baixar PNG (impressão)
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Salve o slug do estabelecimento primeiro</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCrop={handleCropComplete}
        aspectRatio={3}
      />
    </PageContainer>
  );
}
