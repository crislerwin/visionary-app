"use client";

import {
  ContentGrid,
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page-layout";
import { ProductCard, type ProductCardProduct } from "@/components/product-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { logger } from "@/lib/logger";
import { api } from "@/lib/trpc/react";
import { useState } from "react";

// Types based on router output (with serialized dates as strings)
interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number | string;
  stock: number;
  trackStock: boolean;
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string } | null;
  variants: Array<{
    id: string;
    name: string;
    price: number | string;
    stock: number;
    isActive: boolean;
  }>;
}

interface Category {
  id: string;
  name: string;
}

interface VariantInput {
  id: string;
  name: string;
  price: number;
  stock: number;
}

function generateVariantId(): string {
  return `variant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export default function ProductsPage() {
  const { currentTenant } = useCurrentTenant();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form state
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("0");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [trackStock, setTrackStock] = useState(false);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [variantsOpen, setVariantsOpen] = useState(false);

  // Image state
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [cropperTarget, setCropperTarget] = useState<"product" | "category">("product");

  // Category creation form state
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null);

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleEditOpenChange = (open: boolean) => {
    setIsEditOpen(open);
    if (!open) {
      resetForm();
      setSelectedProduct(null);
    }
  };

  const { data: productsData, refetch } = api.product.list.useQuery(
    { tenantId: currentTenant?.id ?? "", limit: 50 },
    { enabled: !!currentTenant?.id },
  );

  const { data: categories, refetch: refetchCategories } = api.category.list.useQuery(
    { tenantId: currentTenant?.id ?? "", includeDeleted: false },
    { enabled: !!currentTenant?.id },
  );

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const createCategoryMutation = api.category.create.useMutation({
    onSuccess: () => {
      setCategoryError(null);
      void refetchCategories();
    },
    onError: (err) => {
      setCategoryError(err.message);
    },
  });

  const createMutation = api.product.create.useMutation({
    onSuccess: () => {
      setCreateError(null);
      setIsCreateOpen(false);
      resetForm();
      void refetch();
    },
    onError: (err) => {
      setCreateError(err.message);
    },
  });

  const updateMutation = api.product.update.useMutation({
    onSuccess: () => {
      setEditError(null);
      setIsEditOpen(false);
      setSelectedProduct(null);
      resetForm();
      void refetch();
    },
    onError: (err) => {
      setEditError(err.message);
    },
  });

  const deleteMutation = api.product.delete.useMutation({
    onSuccess: () => {
      setIsDeleteOpen(false);
      setSelectedProduct(null);
      void refetch();
    },
  });

  const resetForm = () => {
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductStock("0");
    setSelectedCategoryId("");
    setTrackStock(false);
    setVariants([]);
    setVariantsOpen(false);
    setProductImage(null);
    setImageFile(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    if (!currentTenant?.id) throw new Error("Nenhum tenant selecionado");
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenantId", currentTenant.id);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await response.json();
      return data.url as string;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCropperTarget("product");
    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleCropComplete = (croppedFile: File) => {
    if (cropperTarget === "category") {
      setNewCategoryImageFile(croppedFile);
      setNewCategoryImage(null);
    } else {
      setImageFile(croppedFile);
      setProductImage(null);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    if (!currentTenant?.id) {
      setCategoryError("Nenhum tenant selecionado.");
      return;
    }
    if (!newCategoryName.trim()) {
      setCategoryError("O nome da categoria é obrigatório.");
      return;
    }

    let imageUrl: string | undefined;
    if (newCategoryImageFile) {
      try {
        imageUrl = await uploadImage(newCategoryImageFile);
      } catch (error) {
        logger.error({ error }, "Image upload failed");
        return;
      }
    }

    createCategoryMutation.mutate(
      {
        tenantId: currentTenant.id,
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        image: imageUrl,
      },
      {
        onSuccess: (newCategory) => {
          setSelectedCategoryId(newCategory.id);
          setIsCreateCategoryOpen(false);
          setNewCategoryName("");
          setNewCategoryDescription("");
          setNewCategoryImage(null);
          setNewCategoryImageFile(null);
        },
      },
    );
  };

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setProductName(product.name);
    setProductDescription(product.description ?? "");
    setProductPrice(product.price.toString());
    setProductStock(product.stock.toString());
    setSelectedCategoryId(product.categoryId);
    setTrackStock(product.trackStock);
    setProductImage(product.image);
    setImageFile(null);
    setVariants(
      product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        stock: v.stock,
      })),
    );
    setIsEditOpen(true);
  };

  const openDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const addVariant = () => {
    setVariants([...variants, { id: generateVariantId(), name: "", price: 0, stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantInput, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!currentTenant?.id) {
      setCreateError("Nenhum tenant selecionado.");
      return;
    }
    if (!selectedCategoryId) {
      setCreateError("Selecione uma categoria.");
      return;
    }

    let imageUrl: string | undefined;

    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        logger.error({ error }, "Image upload failed");
        setCreateError(error instanceof Error ? error.message : "Falha no upload da imagem.");
        return;
      }
    }

    createMutation.mutate({
      tenantId: currentTenant.id,
      name: productName,
      description: productDescription || undefined,
      image: imageUrl,
      price: Number.parseFloat(productPrice) || 0,
      categoryId: selectedCategoryId,
      stock: Number.parseInt(productStock) || 0,
      trackStock,
      variants: variants.length > 0 ? variants : undefined,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!selectedProduct || !currentTenant?.id) {
      setEditError("Nenhum produto ou tenant selecionado.");
      return;
    }

    let imageUrl: string | null | undefined = undefined;

    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        logger.error({ error }, "Image upload failed");
        setEditError(error instanceof Error ? error.message : "Falha no upload da imagem.");
        return;
      }
    } else if (productImage === null && selectedProduct.image !== null) {
      // Image was explicitly removed
      imageUrl = null;
    }

    updateMutation.mutate({
      id: selectedProduct.id,
      tenantId: currentTenant.id,
      name: productName,
      description: productDescription || null,
      image: imageUrl,
      price: Number.parseFloat(productPrice) || 0,
      categoryId: selectedCategoryId,
      stock: Number.parseInt(productStock) || 0,
      trackStock,
      isActive: true,
      variants:
        variants.length > 0
          ? variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              stock: v.stock,
            }))
          : undefined,
    });
  };

  const confirmDelete = () => {
    if (!selectedProduct || !currentTenant?.id) return;

    deleteMutation.mutate({
      id: selectedProduct.id,
      tenantId: currentTenant.id,
    });
  };

  return (
    <PageContainer>
      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <PageHeader
          title="Produtos"
          description="Seu cardápio"
          action={
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <Icons.plus className="mr-1.5 h-4 w-4" />
                <span className="sm:hidden">Novo</span>
                <span className="hidden sm:inline">Novo Produto</span>
              </Button>
            </DialogTrigger>
          }
        />
        <DialogContent className="max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Adicionar Produto</DialogTitle>
            <DialogDescription>Crie um novo produto para seu cardápio</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 py-3 px-6 overflow-y-auto flex-1">
              {/* Seção 1: Informações Básicas */}
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Icons.clipboardList className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Informações Básicas
                  </h4>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Hambúrguer Clássico"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Imagem do Produto</Label>
                  <div className="flex items-center gap-4">
                    {(productImage || imageFile) && (
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border shrink-0">
                        <img
                          src={
                            imageFile ? URL.createObjectURL(imageFile) : (productImage ?? undefined)
                          }
                          alt="Preview"
                          className="h-full w-full object-cover"
                          crossOrigin="anonymous"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProductImage(null);
                            setImageFile(null);
                          }}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
                        >
                          <Icons.close className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-6 py-10 text-sm text-muted-foreground hover:bg-muted flex-1 justify-center">
                      <Icons.image className="h-6 w-6" />
                      <span>
                        {productImage || imageFile ? "Trocar imagem" : "Adicionar imagem"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descrição <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="description"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Uma breve descrição do produto"
                    maxLength={2000}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">
                      Preço <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Icons.dollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="0,00"
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Categoria <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={(val) => {
                        if (val === "__create__") {
                          setIsCreateCategoryOpen(true);
                          return;
                        }
                        setSelectedCategoryId(val);
                      }}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem
                          value="__create__"
                          className="text-primary font-medium cursor-pointer"
                        >
                          <Icons.plus className="mr-2 h-4 w-4" />
                          Criar Categoria
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Estoque */}
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.package className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Estoque
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="trackStock" checked={trackStock} onCheckedChange={setTrackStock} />
                    <Label htmlFor="trackStock" className="text-sm font-normal cursor-pointer">
                      Controlar estoque
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock" className={!trackStock ? "text-muted-foreground" : ""}>
                    Quantidade em Estoque
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    disabled={!trackStock}
                    placeholder={trackStock ? "0" : "Desativado"}
                  />
                </div>
              </div>

              {/* Seção 3: Variantes */}
              <Collapsible open={variantsOpen} onOpenChange={setVariantsOpen}>
                <div className="rounded-lg border bg-card p-3 space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between px-0 hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2">
                        <Icons.layers className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Variantes
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{variants.length}</Badge>
                        <Icons.chevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            variantsOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Adicione opções como tamanhos (P, M, G) ou complementos (com/sem queijo)
                    </p>
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id}
                        className="grid grid-cols-12 gap-2 items-end rounded-md border bg-background p-3"
                      >
                        <div className="col-span-5">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariant(index, "name", e.target.value)}
                            placeholder="Ex: Grande"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground">Preço</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price || ""}
                            onChange={(e) =>
                              updateVariant(index, "price", Number.parseFloat(e.target.value) || 0)
                            }
                            placeholder="0,00"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground">Estoque</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stock || ""}
                            onChange={(e) =>
                              updateVariant(index, "stock", Number.parseInt(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(index)}
                            className="text-destructive h-9 w-9"
                          >
                            <Icons.trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariant}
                      className="w-full mt-2"
                    >
                      <Icons.plus className="mr-2 h-4 w-4" />
                      Adicionar Variante
                    </Button>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
            {createError && <p className="px-6 pt-2 text-sm text-red-500">{createError}</p>}
            <DialogFooter className="gap-2 pt-4 pb-6 px-6 border-t bg-background shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateOpenChange(false)}
                disabled={createMutation.isPending || isUploadingImage}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || isUploadingImage}>
                {(createMutation.isPending || isUploadingImage) && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Criar Produto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ContentGrid>
        {productsData?.products.map((product) => {
          const cardProduct: ProductCardProduct = {
            ...product,
            price: Number(product.price),
            variants: product.variants.map((v) => ({
              ...v,
              price: Number(v.price),
            })),
          };

          return (
            <ProductCard
              key={product.id}
              product={cardProduct}
              badge={
                !product.isActive ? (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    Inativo
                  </span>
                ) : undefined
              }
              headerAction={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 bg-background/70 backdrop-blur-sm hover:bg-background/90 text-foreground border border-border/50 shadow-sm"
                    >
                      <Icons.moreVertical className="h-4 w-4" />
                      <span className="sr-only">Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(product)}>
                      <Icons.edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openDelete(product)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Icons.trash className="mr-2 h-4 w-4" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          );
        })}
      </ContentGrid>

      {productsData?.products.length === 0 && (
        <EmptyState
          icon={<Icons.package className="h-12 w-12" />}
          title="Nenhum produto encontrado"
          description="Comece adicionando seu primeiro produto ao cardápio"
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>Atualize as informações do produto</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 py-3 px-6 overflow-y-auto flex-1">
              {/* Seção 1: Informações Básicas */}
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Icons.clipboardList className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Informações Básicas
                  </h4>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Hambúrguer Clássico"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Imagem do Produto</Label>
                  <div className="flex items-center gap-4">
                    {(productImage || imageFile) && (
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border shrink-0">
                        <img
                          src={
                            imageFile ? URL.createObjectURL(imageFile) : (productImage ?? undefined)
                          }
                          alt="Preview"
                          className="h-full w-full object-cover"
                          crossOrigin="anonymous"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProductImage(null);
                            setImageFile(null);
                          }}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
                        >
                          <Icons.close className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-6 py-10 text-sm text-muted-foreground hover:bg-muted flex-1 justify-center">
                      <Icons.image className="h-6 w-6" />
                      <span>
                        {productImage || imageFile ? "Trocar imagem" : "Adicionar imagem"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">
                    Descrição <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="edit-description"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Uma breve descrição do produto"
                    maxLength={2000}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">
                      Preço <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Icons.dollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">
                      Categoria <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={(val) => {
                        if (val === "__create__") {
                          setIsCreateCategoryOpen(true);
                          return;
                        }
                        setSelectedCategoryId(val);
                      }}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem
                          value="__create__"
                          className="text-primary font-medium cursor-pointer"
                        >
                          <Icons.plus className="mr-2 h-4 w-4" />
                          Criar Categoria
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Estoque */}
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.package className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Estoque
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-trackStock"
                      checked={trackStock}
                      onCheckedChange={setTrackStock}
                    />
                    <Label htmlFor="edit-trackStock" className="text-sm font-normal cursor-pointer">
                      Controlar estoque
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-stock"
                    className={!trackStock ? "text-muted-foreground" : ""}
                  >
                    Quantidade em Estoque
                  </Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    disabled={!trackStock}
                    placeholder={trackStock ? "0" : "Desativado"}
                  />
                </div>
              </div>

              {/* Seção 3: Variantes */}
              <Collapsible open={variantsOpen} onOpenChange={setVariantsOpen}>
                <div className="rounded-lg border bg-card p-3 space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between px-0 hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2">
                        <Icons.layers className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Variantes
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{variants.length}</Badge>
                        <Icons.chevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            variantsOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Adicione opções como tamanhos (P, M, G) ou complementos (com/sem queijo)
                    </p>
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id}
                        className="grid grid-cols-12 gap-2 items-end rounded-md border bg-background p-3"
                      >
                        <div className="col-span-5">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariant(index, "name", e.target.value)}
                            placeholder="Ex: Grande"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground">Preço</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price || ""}
                            onChange={(e) =>
                              updateVariant(index, "price", Number.parseFloat(e.target.value) || 0)
                            }
                            placeholder="0,00"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground">Estoque</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stock || ""}
                            onChange={(e) =>
                              updateVariant(index, "stock", Number.parseInt(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(index)}
                            className="text-destructive h-9 w-9"
                          >
                            <Icons.trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariant}
                      className="w-full mt-2"
                    >
                      <Icons.plus className="mr-2 h-4 w-4" />
                      Adicionar Variante
                    </Button>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
            {editError && <p className="px-6 pt-2 text-sm text-red-500">{editError}</p>}
            <DialogFooter className="gap-2 pt-4 pb-6 px-6 border-t bg-background shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditOpenChange(false)}
                disabled={updateMutation.isPending || isUploadingImage}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || isUploadingImage}>
                {(updateMutation.isPending || isUploadingImage) && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto &quot;{selectedProduct?.name}&quot; será movido para a lixeira. Você poderá
              restaurá-lo posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para organizar seus produtos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-cat-name">Nome *</Label>
                <Input
                  id="new-cat-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Lanches, Bebidas..."
                  required
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-cat-desc">Descrição (opcional)</Label>
                <Input
                  id="new-cat-desc"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Descrição da categoria"
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem da Categoria</Label>
                <div className="flex items-center gap-4">
                  {(newCategoryImage || newCategoryImageFile) && (
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border shrink-0">
                      <img
                        src={
                          newCategoryImageFile
                            ? URL.createObjectURL(newCategoryImageFile)
                            : (newCategoryImage ?? undefined)
                        }
                        alt="Preview"
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryImage(null);
                          setNewCategoryImageFile(null);
                        }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
                      >
                        <Icons.close className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-6 py-10 text-sm text-muted-foreground hover:bg-muted flex-1 justify-center">
                    <Icons.image className="h-6 w-6" />
                    <span>
                      {newCategoryImage || newCategoryImageFile
                        ? "Trocar imagem"
                        : "Adicionar imagem"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCropperTarget("category");
                        const reader = new FileReader();
                        reader.onload = () => {
                          setCropperImageSrc(reader.result as string);
                          setCropperOpen(true);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            {categoryError && <p className="px-6 pt-2 text-sm text-red-500">{categoryError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateCategoryOpen(false)}
                disabled={createCategoryMutation.isPending || isUploadingImage}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createCategoryMutation.isPending || isUploadingImage}>
                {(createCategoryMutation.isPending || isUploadingImage) && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCrop={handleCropComplete}
        aspectRatio={4 / 3}
      />
    </PageContainer>
  );
}
