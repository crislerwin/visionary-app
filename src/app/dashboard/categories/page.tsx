"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/lib/trpc/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Category = RouterOutputs["category"]["list"][number];

export default function CategoriesPage() {
  const { currentTenant } = useCurrentTenant();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Form state
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const { data: categories, refetch } = api.category.list.useQuery(
    { tenantId: currentTenant?.id ?? "", includeDeleted: false },
    { enabled: !!currentTenant?.id }
  );

  const createMutation = api.category.create.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      resetForm();
      void refetch();
    },
  });

  const updateMutation = api.category.update.useMutation({
    onSuccess: () => {
      setIsEditOpen(false);
      setSelectedCategory(null);
      resetForm();
      void refetch();
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
  };

  const openEdit = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description ?? "");
    setIsEditOpen(true);
  };

  const openDelete = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;
    
    createMutation.mutate({
      tenantId: currentTenant.id,
      name: categoryName,
      description: categoryDescription || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !currentTenant?.id) return;
    
    updateMutation.mutate({
      id: selectedCategory.id,
      tenantId: currentTenant.id,
      name: categoryName,
      description: categoryDescription || null,
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
    <DashboardShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias do seu cardápio
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Categoria</DialogTitle>
              <DialogDescription>
                Crie uma nova categoria para organizar seus produtos
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
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
        {categories?.map((category) => (
          <Card key={category.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {category.name}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(category)}
                >
                  <Icons.edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDelete(category)}
                >
                  <Icons.trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {category.description || "Sem descrição"}
              </p>
              <div className="mt-4 flex items-center text-xs text-muted-foreground">
                <Icons.list className="mr-1 h-3 w-3" />
                {category._count.products} produtos
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Atualize as informações da categoria
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
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
              A categoria &quot;{selectedCategory?.name}&quot; será excluída.
              {selectedCategory?._count.products > 0 && (
                <span className="text-destructive font-medium">
                  {" "}
                  Esta categoria tem {selectedCategory?._count.products} produto(s).
                  Mova ou delete os produtos primeiro.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel >Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              >
              {/* {deleteMutation.isPending && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )} */}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
