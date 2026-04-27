"use client";

import { api } from "@/lib/trpc/react";
import { useState } from "react";

import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page-layout";
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
import { Button } from "@/components/ui/button";
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
import { useCurrentTenant } from "@/hooks/use-current-tenant";

interface Category {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  _count?: { products: number };
}

export default function CategoriesPage() {
  const { currentTenant } = useCurrentTenant();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Image state
  const [categoryImage, setCategoryImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");

  const { data: categories, refetch } = api.category.list.useQuery(
    { tenantId: currentTenant?.id ?? "", includeDeleted: false },
    { enabled: !!currentTenant?.id },
  );

  const createMutation = api.category.create.useMutation({
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

  const updateMutation = api.category.update.useMutation({
    onSuccess: () => {
      setEditError(null);
      setIsEditOpen(false);
      setSelectedCategory(null);
      resetForm();
      void refetch();
    },
    onError: (err) => {
      setEditError(err.message);
    },
  });

  const deleteMutation = api.category.delete.useMutation({
    onSuccess: () => {
      setIsDeleteOpen(false);
      setSelectedCategory(null);
      void refetch();
    },
  });

  const resetForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryImage(null);
    setImageFile(null);
    setCreateError(null);
    setEditError(null);
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
    setCategoryImage(null);
  };

  const openEdit = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description ?? "");
    setCategoryImage(category.image);
    setImageFile(null);
    setIsEditOpen(true);
  };

  const openDelete = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!currentTenant?.id) {
      setCreateError("Nenhum tenant selecionado.");
      return;
    }

    let imageUrl: string | undefined;
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha no upload da imagem";
        setCreateError(message);
        return;
      }
    }

    createMutation.mutate({
      tenantId: currentTenant.id,
      name: categoryName,
      description: categoryDescription || undefined,
      image: imageUrl,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!selectedCategory || !currentTenant?.id) {
      setEditError("Nenhum tenant selecionado.");
      return;
    }

    let imageUrl: string | null | undefined = undefined;
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha no upload da imagem";
        setEditError(message);
        return;
      }
    } else if (categoryImage === null && selectedCategory.image !== null) {
      // Image was explicitly removed
      imageUrl = null;
    }

    updateMutation.mutate({
      id: selectedCategory.id,
      tenantId: currentTenant.id,
      name: categoryName,
      description: categoryDescription || null,
      image: imageUrl,
    });
  };

  const confirmDelete = () => {
    if (!selectedCategory || !currentTenant?.id) return;

    deleteMutation.mutate({
      id: selectedCategory.id,
      tenantId: currentTenant.id,
    });
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <PageHeader
            title="Categorias"
            description="Organize seus produtos"
            action={
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0">
                  <Icons.plus className="mr-1.5 h-4 w-4" />
                  <span className="sm:hidden">Nova</span>
                  <span className="hidden sm:inline">Nova Categoria</span>
                </Button>
              </DialogTrigger>
            }
          />
          <DialogContent className="max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Adicionar Categoria</DialogTitle>
              <DialogDescription>
                Crie uma nova categoria para organizar seus produtos
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 py-3 px-6 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: Lanches, Bebidas..."
                    required
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Descrição da categoria"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagem da Categoria</Label>
                  <div className="flex items-center gap-4">
                    {(categoryImage || imageFile) && (
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border shrink-0">
                        <img
                          src={
                            imageFile
                              ? URL.createObjectURL(imageFile)
                              : (categoryImage ?? undefined)
                          }
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryImage(null);
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
                        {categoryImage || imageFile ? "Trocar imagem" : "Adicionar imagem"}
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
              </div>
              {createError && <p className="px-6 pt-2 text-sm text-red-500">{createError}</p>}
              <DialogFooter className="gap-2 pt-4 pb-6 px-6 border-t bg-background shrink-0">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {categories?.map((category) => (
            <div
              key={category.id}
              className="flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md gap-0 p-0"
            >
              <div className="relative h-28 bg-muted overflow-hidden flex items-center justify-center">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Icons.list className="h-5 w-5 opacity-30 mb-0.5" />
                    <span className="text-[10px] opacity-50 uppercase tracking-wider">
                      Categoria
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
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
                      <DropdownMenuItem onClick={() => openEdit(category)}>
                        <Icons.edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDelete(category)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Icons.trash className="mr-2 h-4 w-4" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="px-3 pt-2 pb-0">
                <h3 className="text-sm font-semibold leading-tight line-clamp-1 break-words">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="px-3 py-1.5 flex-1">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Icons.package className="mr-1 h-3 w-3" />
                  {category._count?.products ?? 0} produtos
                </div>
              </div>
            </div>
          ))}
        </div>

        {categories?.length === 0 && (
          <EmptyState
            icon={<Icons.list className="h-12 w-12" />}
            title="Nenhuma categoria encontrada"
            description="Comece criando sua primeira categoria"
          />
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Editar Categoria</DialogTitle>
              <DialogDescription>Atualize as informações da categoria</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 py-3 px-6 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Input
                    id="edit-description"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagem da Categoria</Label>
                  <div className="flex items-center gap-4">
                    {(categoryImage || imageFile) && (
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border shrink-0">
                        <img
                          src={
                            imageFile
                              ? URL.createObjectURL(imageFile)
                              : (categoryImage ?? undefined)
                          }
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryImage(null);
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
                        {categoryImage || imageFile ? "Trocar imagem" : "Adicionar imagem"}
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
              </div>
              {editError && <p className="px-6 pt-2 text-sm text-red-500">{editError}</p>}
              <DialogFooter className="gap-2 pt-4 pb-6 px-6 border-t bg-background shrink-0">
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

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader className="space-y-2">
              <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
              <AlertDialogDescription>
                A categoria &quot;{selectedCategory?.name}&quot; será excluída.
                {(selectedCategory?._count?.products ?? 0) > 0 && (
                  <span className="text-destructive font-medium block mt-2">
                    Esta categoria tem {selectedCategory?._count?.products} produto(s). Mova ou
                    delete os produtos primeiro.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ImageCropperDialog
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={cropperImageSrc}
          onCrop={handleCropComplete}
          aspectRatio={1}
        />
      </div>
    </PageContainer>
  );
}
