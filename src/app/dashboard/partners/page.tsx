"use client";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

interface PartnerRow {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  commissionType: string;
  commissionValue: number;
  status: string;
  _count: { invoices: number };
}

const partnerTypeLabels: Record<string, string> = {
  SUPPLIER: "Fornecedor",
  AFFILIATE: "Afiliado",
  DISTRIBUTOR: "Distribuidor",
  SERVICE_PROVIDER: "Prestador",
  OTHER: "Outro",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  INACTIVE: "bg-muted text-muted-foreground",
  BLOCKED: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
};

function formatCommission(row: PartnerRow) {
  if (row.commissionValue <= 0) return "Sem comissão";
  if (row.commissionType === "PERCENTAGE") return `${row.commissionValue}%`;
  if (row.commissionType === "FIXED") return `R$ ${row.commissionValue.toFixed(2)}`;
  return `R$ ${row.commissionValue.toFixed(2)} + %`;
}

export default function PartnersPage() {
  const { toast } = useToast();
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const utils = api.useUtils();
  const tenantReady = !tenantLoading && !!currentTenant;

  const [formOpen, setFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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

  const rows: PartnerRow[] = useMemo(() => (partners as PartnerRow[]) ?? [], [partners]);

  const filteredRows = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((p) => p.type === typeFilter);
  }, [rows, typeFilter]);

  const columns: ColumnDef<PartnerRow>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px]">
          {partnerTypeLabels[row.original.type] ?? row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.email ?? "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={`text-[10px] ${statusColors[row.original.status] ?? ""}`}>
          {statusLabels[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "commission",
      header: "Comissão",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatCommission(row.original)}</span>
      ),
    },
    {
      id: "invoices",
      header: "Faturas",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original._count.invoices}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingPartner(row.original as unknown as Record<string, unknown>);
              setFormOpen(true);
            }}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteTarget(row.original.id)}
            className="text-destructive hover:text-destructive"
            title="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Parceiros</h1>
          <p className="text-sm text-muted-foreground">
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

      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
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

      <DataTable
        columns={columns}
        data={filteredRows}
        loading={tenantLoading || isLoading}
        searchKey="name"
        searchPlaceholder="Buscar parceiro..."
      />

      <PartnerForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPartner(null);
        }}
        partnerId={editingPartner?.id as string | undefined}
        defaultValues={editingPartner ?? undefined}
      />

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
