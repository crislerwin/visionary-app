"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Icons } from "@/components/ui/icons";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
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
  name: string;
  price: number;
  stock: number;
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

  // Category creation form state
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const { data: productsData, refetch } = api.product.list.useQuery(
    { tenantId: currentTenant?.id ?? "", limit: 50 },
    { enabled: !!currentTenant?.id },
  );

  const { data: categories, refetch: refetchCategories } = api.category.list.useQuery(
    { tenantId: currentTenant?.id ?? "", includeDeleted: false },
    { enabled: !!currentTenant?.id },
  );

  const createCategoryMutation = api.category.create.useMutation({
    onSuccess: () => {
      void refetchCategories();
    },
  });

  const createMutation = api.product.create.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      resetForm();
      void refetch();
    },
  });

  const updateMutation = api.product.update.useMutation({
    onSuccess: () => {
      setIsEditOpen(false);
      setSelectedProduct(null);
      resetForm();
      void refetch();
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
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

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
    setImageFile(croppedFile);
    setProductImage(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id || !newCategoryName.trim()) return;

    createCategoryMutation.mutate(
      {
        tenantId: currentTenant.id,
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      },
      {
        onSuccess: (newCategory) => {
          setSelectedCategoryId(newCategory.id);
          setIsCreateCategoryOpen(false);
          setNewCategoryName("");
          setNewCategoryDescription("");
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
    setVariants([...variants, { name: "", price: 0, stock: 0 }]);
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
    if (!currentTenant?.id || !selectedCategoryId) return;

    let imageUrl: string | undefined;

    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        console.error("Image upload failed:", error);
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
    if (!selectedProduct || !currentTenant?.id) return;

    let imageUrl: string | null | undefined = undefined;

    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        console.error("Image upload failed:", error);
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
    });
  };

  const confirmDelete = () => {
    if (!selectedProduct || !currentTenant?.id) return;

    deleteMutation.mutate({
      id: selectedProduct.id,
      tenantId: currentTenant.id,
    });
  };

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(price));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Gerencie os produtos do seu cardápio</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
              <DialogDescription>Crie um novo produto para seu cardápio</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Hambúrguer Clássico"
                    required
                    maxLength={100}
                  />
                </div>
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Imagem do Produto</Label>
                  <div className="flex items-center gap-4">
                    {(productImage || imageFile) && (
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                        <img
                          src={
                            imageFile ? URL.createObjectURL(imageFile) : (productImage ?? undefined)
                          }
                          alt="Preview"
                          className="h-full w-full object-cover"
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
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-muted">
                      <Icons.image className="h-4 w-4" />
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
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Descrição do produto"
                    maxLength={2000}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço</Label>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="category">Categoria</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreateCategoryOpen(true)}
                        className="h-auto px-2 py-1 text-xs"
                      >
                        <Icons.plus className="mr-1 h-3 w-3" />
                        Nova
                      </Button>
                    </div>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={setSelectedCategoryId}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stock">Estoque</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="trackStock"
                        checked={trackStock}
                        onCheckedChange={setTrackStock}
                      />
                      <Label htmlFor="trackStock" className="text-sm font-normal cursor-pointer">
                        Controlar estoque
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    disabled={!trackStock}
                  />
                </div>

                {/* Variants Section */}
                <Collapsible open={variantsOpen} onOpenChange={setVariantsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between">
                      <div className="flex items-center">
                        <Icons.layers className="mr-2 h-4 w-4" />
                        <span>Variantes ({variants.length})</span>
                      </div>
                      <Icons.chevronDown
                        className={`h-4 w-4 transition-transform ${
                          variantsOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <p className="text-sm text-muted-foreground">
                      Adicione variantes como tamanhos (P, M, G) ou opções (com/sem queijo)
                    </p>
                    {variants.map((variant, index) => (
                      <div
                        key={`variant-new-${variant.name}-${index}`}
                        className="grid grid-cols-12 gap-2 items-end rounded-md border p-3"
                      >
                        <div className="col-span-5">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariant(index, "name", e.target.value)}
                            placeholder="Ex: Grande"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Preço</Label>
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
                          <Label className="text-xs">Estoque</Label>
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
                            className="text-destructive"
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
                      className="w-full"
                    >
                      <Icons.plus className="mr-2 h-4 w-4" />
                      Adicionar Variante
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createMutation.isPending || isUploadingImage}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || isUploadingImage}>
                  {(createMutation.isPending || isUploadingImage) && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Criar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {productsData?.products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">{product.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {product.category?.name || "Sem categoria"}
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                  <Icons.edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openDelete(product)}>
                  <Icons.trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {product.image && (
                <div className="mb-3 h-32 w-full overflow-hidden rounded-md">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {product.description || "Sem descrição"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{formatPrice(product.price)}</span>
                {product.trackStock && (
                  <Badge
                    variant={product.stock > 0 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {product.stock} em estoque
                  </Badge>
                )}
              </div>
              {product.variants.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Variantes:</p>
                  <div className="flex flex-wrap gap-1">
                    {product.variants.slice(0, 3).map((variant) => (
                      <Badge key={variant.id} variant="outline" className="text-xs">
                        {variant.name}: {formatPrice(variant.price)}
                      </Badge>
                    ))}
                    {product.variants.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{product.variants.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {productsData?.products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icons.package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Comece adicionando seu primeiro produto ao cardápio
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>Atualize as informações do produto</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              {/* Image Upload Edit */}
              <div className="space-y-2">
                <Label>Imagem do Produto</Label>
                <div className="flex items-center gap-4">
                  {(productImage || imageFile) && (
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <img
                        src={
                          imageFile ? URL.createObjectURL(imageFile) : (productImage ?? undefined)
                        }
                        alt="Preview"
                        className="h-full w-full object-cover"
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
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-muted">
                    <Icons.image className="h-4 w-4" />
                    <span>{productImage || imageFile ? "Trocar imagem" : "Adicionar imagem"}</span>
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
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Preço</Label>
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
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-stock">Estoque</Label>
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
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  value={productStock}
                  onChange={(e) => setProductStock(e.target.value)}
                  disabled={!trackStock}
                />
              </div>

              {/* Variants Section in Edit */}
              <Collapsible open={variantsOpen} onOpenChange={setVariantsOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between">
                    <div className="flex items-center">
                      <Icons.layers className="mr-2 h-4 w-4" />
                      <span>Variantes ({variants.length})</span>
                    </div>
                    <Icons.chevronDown
                      className={`h-4 w-4 transition-transform ${variantsOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  {variants.map((variant, index) => (
                    <div
                      key={`variant-new-${variant.name}-${index}`}
                      className="grid grid-cols-12 gap-2 items-end rounded-md border p-3"
                    >
                      <div className="col-span-5">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={variant.name}
                          onChange={(e) => updateVariant(index, "name", e.target.value)}
                          placeholder="Ex: Grande"
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Preço</Label>
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
                        <Label className="text-xs">Estoque</Label>
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
                          className="text-destructive"
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
                    className="w-full"
                  >
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Adicionar Variante
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={updateMutation.isPending || isUploadingImage}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || isUploadingImage}>
                {(updateMutation.isPending || isUploadingImage) && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto &quot;{selectedProduct?.name}&quot; será movido para a lixeira. Você poderá
              restaurá-lo posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateCategoryOpen(false)}
                disabled={createCategoryMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending && (
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
    </>
  );
}
