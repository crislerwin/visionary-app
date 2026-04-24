"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/lib/trpc/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Icons } from "@/components/ui/icons";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Product = RouterOutputs["product"]["list"]["products"][number];
type Category = RouterOutputs["category"]["list"][number];

interface VariantForm {
  id?: string;
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
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    stock: "0",
    trackStock: false,
    image: "",
  });
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [variantForm, setVariantForm] = useState<VariantForm>({
    name: "",
    price: 0,
    stock: 0,
  });

  const { data: productsData, refetch } = api.product.list.useQuery(
    {
      tenantId: currentTenant?.id ?? "",
      includeDeleted: false,
    },
    { enabled: !!currentTenant?.id }
  );

  const { data: categories } = api.category.list.useQuery(
    { tenantId: currentTenant?.id ?? "", includeDeleted: false },
    { enabled: !!currentTenant?.id }
  );

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

  const addVariantMutation = api.product.addVariant.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const updateVariantMutation = api.product.updateVariant.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const deleteVariantMutation = api.product.deleteVariant.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      categoryId: "",
      stock: "0",
      trackStock: false,
      image: "",
    });
    setVariants([]);
    setVariantForm({ name: "", price: 0, stock: 0 });
  };

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description ?? "",
      price: product.price.toString(),
      categoryId: product.categoryId,
      stock: product.stock.toString(),
      trackStock: product.trackStock,
      image: product.image ?? "",
    });
    setVariants(product.variants.map((v) => ({ ...v })));
    setIsEditOpen(true);
  };

  const openDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    createMutation.mutate({
      tenantId: currentTenant.id,
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price) || 0,
      categoryId: formData.categoryId,
      stock: parseInt(formData.stock) || 0,
      trackStock: formData.trackStock,
      image: formData.image || undefined,
      variants: variants.map((v) => ({
        name: v.name,
        price: v.price,
        stock: v.stock,
      })),
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !currentTenant?.id) return;

    updateMutation.mutate({
      id: selectedProduct.id,
      tenantId: currentTenant.id,
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
      categoryId: formData.categoryId,
      stock: parseInt(formData.stock) || 0,
      trackStock: formData.trackStock,
      image: formData.image || null,
    });
  };

  const confirmDelete = () => {
    if (!selectedProduct || !currentTenant?.id) return;

    deleteMutation.mutate({
      id: selectedProduct.id,
      tenantId: currentTenant.id,
    });
  };

  const addVariant = () => {
    if (!variantForm.name) return;
    setVariants([...variants, { ...variantForm }]);
    setVariantForm({ name: "", price: 0, stock: 0 });
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const products = productsData?.products ?? [];

  return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos do seu cardápio
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
              <DialogDescription>
                Crie um novo produto para o seu cardápio
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Hambúrguer Artesanal"
                      required
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, categoryId: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descreva o produto..."
                    maxLength={2000}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Estoque</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="trackStock"
                        checked={formData.trackStock}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, trackStock: checked })
                        }
                      />
                      <Label htmlFor="trackStock">Controlar estoque</Label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">URL da Imagem</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                {/* Variants Section */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <Icons.layers className="mr-2 h-4 w-4" />
                        Variantes ({variants.length})
                      </span>
                      <Icons.chevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome (ex: Grande, Vermelho)"
                        value={variantForm.name}
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, name: e.target.value })
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Preço"
                        value={variantForm.price || ""}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-28"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Estoque"
                        value={variantForm.stock || ""}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            stock: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-24"
                      />
                      <Button type="button" onClick={addVariant} size="icon">
                        <Icons.plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {variants.length > 0 && (
                      <div className="space-y-2">
                        {variants.map((variant, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-muted p-2 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <Icons.tag className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{variant.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {formatPrice(variant.price)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVariant(index)}
                            >
                              <Icons.minus className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
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
        {products.map((product) => (
          <Card
            key={product.id}
            className={cn(
              "transition-shadow hover:shadow-md",
              !product.isActive && "opacity-60"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-medium truncate">
                    {product.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {product.category.name}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(product)}
                  >
                    <Icons.edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDelete(product)}
                  >
                    <Icons.trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {product.description || "Sem descrição"}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.dollarSign className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    {formatPrice(product.price)}
                  </span>
                </div>
                {product.trackStock && (
                  <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>
                    Estoque: {product.stock}
                  </Badge>
                )}
              </div>

              {/* Variants */}
              {product.variants.length > 0 && (
                <Collapsible
                  open={expandedProduct === product.id}
                  onOpenChange={(open) =>
                    setExpandedProduct(open ? product.id : null)
                  }
                  className="mt-3"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full flex items-center justify-between px-0 h-auto py-2"
                    >
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Icons.layers className="mr-1 h-3 w-3" />
                        {product.variants.length} variantes
                      </span>
                      <Icons.chevronDown
                        className={cn(
                          "h-3 w-3 text-muted-foreground transition-transform",
                          expandedProduct === product.id && "rotate-180"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1 pt-2">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                        >
                          <span>{variant.name}</span>
                          <span className="font-medium">
                            {formatPrice(variant.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icons.package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground max-w-sm mt-1">
            Comece adicionando um novo produto ao seu cardápio
          </p>
          <Button
            className="mt-4"
            onClick={() => setIsCreateOpen(true)}
          >
            <Icons.plus className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>Atualize as informações do produto</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoria *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Preço (R$) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Estoque</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-trackStock"
                      checked={formData.trackStock}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, trackStock: checked })
                      }
                    />
                    <Label htmlFor="edit-trackStock">Controlar estoque</Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image">URL da Imagem</Label>
                <Input
                  id="edit-image"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              {/* Variants Section */}
              {selectedProduct && variants.length > 0 && (
                <div className="space-y-2">
                  <Label>Variantes Existentes</Label>
                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between bg-muted p-2 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Icons.tag className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{variant.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatPrice(variant.price)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (variant.id && currentTenant?.id) {
                              deleteVariantMutation.mutate({
                                tenantId: currentTenant.id,
                                variantId: variant.id,
                              });
                            }
                            setVariants(variants.filter((v) => v.id !== variant.id));
                          }}
                        >
                          <Icons.minus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
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
              O produto &quot;{selectedProduct?.name}&quot; será excluído.
              Esta ação pode ser desfeita pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
