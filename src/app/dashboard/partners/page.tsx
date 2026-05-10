"use client";

import { PartnerCard } from "@/components/partners/PartnerCard";
import { PartnerForm } from "@/components/partners/PartnerForm";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { Handshake, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function PartnersPage() {
  const { toast } = useToast();
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const utils = api.useUtils();
  const tenantReady = !tenantLoading && !!currentTenant;

  const [formOpen, setFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: partners, isLoading } = api.partner.list.useQuery(undefined, {
    enabled: tenantReady,
  });

  const deleteMutation = api.partner.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Parceiro removido!" });
      utils.partner.list.invalidate();
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredPartners = useMemo(() => {
    if (!partners) return [];
    return partners.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      return true;
    });
  }, [partners, search, typeFilter]);

  if (tenantLoading || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Parceiros</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie fornecedores, afiliados e outros parceiros de negócio
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPartner(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Parceiro
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar parceiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="SUPPLIER">Fornecedor</SelectItem>
            <SelectItem value="AFFILIATE">Afiliado</SelectItem>
            <SelectItem value="DISTRIBUTOR">Distribuidor</SelectItem>
            <SelectItem value="SERVICE_PROVIDER">Prestador</SelectItem>
            <SelectItem value="OTHER">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Partner List */}
      {filteredPartners.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Handshake className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">
            {search || typeFilter !== "all"
              ? "Nenhum parceiro encontrado"
              : "Nenhum parceiro cadastrado"}
          </p>
          <p className="text-sm mt-1">
            {search || typeFilter !== "all"
              ? "Tente ajustar os filtros de busca."
              : "Cadastre seu primeiro parceiro para começar."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPartners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onEdit={(p) => {
                setEditingPartner(p);
                setFormOpen(true);
              }}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <PartnerForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPartner(null);
        }}
        partnerId={editingPartner?.id as string | undefined}
        defaultValues={editingPartner ?? undefined}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os dados do parceiro e suas faturas serão
              permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget })}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Removendo..." : "Sim, remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
