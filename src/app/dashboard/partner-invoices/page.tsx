"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Clock, DollarSign, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface PartnerInvoiceRow {
  id: string;
  partner: { id: string; name: string; type: string };
  amount: number;
  description: string | null;
  dueDate: Date | string;
  paidAt: Date | string | null;
  status: string;
  reference: string | null;
  notes: string | null;
}

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  PAID: <CheckCircle2 className="h-4 w-4" />,
  OVERDUE: <AlertTriangle className="h-4 w-4" />,
  CANCELLED: <Minus className="h-4 w-4" />,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const columns: ColumnDef<PartnerInvoiceRow>[] = [
  {
    accessorKey: "partner.name",
    header: "Parceiro",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.partner.name}</div>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Descrição",
  },
  {
    accessorKey: "amount",
    header: "Valor",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{formatCurrency(row.original.amount)}</span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Vencimento",
    cell: ({ row }) => (
      <span>{format(new Date(row.original.dueDate), "dd/MM/yyyy", { locale: ptBR })}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <Badge className={`${statusColors[s]} flex items-center gap-1 w-fit`}>
          {statusIcons[s]}
          {statusLabels[s] ?? s}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => {
      const invoice = row.original;
      const utils = api.useUtils();
      const payMutation = api.partnerInvoice.pay.useMutation({
        onSuccess: () => {
          utils.partnerInvoice.invalidate();
        },
      });

      if (invoice.status === "PENDING" || invoice.status === "OVERDUE") {
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => payMutation.mutate({ id: invoice.id })}
            disabled={payMutation.isPending}
          >
            {payMutation.isPending ? "..." : "Pagar"}
          </Button>
        );
      }
      if (invoice.status === "PAID" && invoice.paidAt) {
        return (
          <span className="text-xs text-muted-foreground">
            Pago em {format(new Date(invoice.paidAt), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        );
      }
      return null;
    },
  },
];

export default function PartnerInvoicesPage() {
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const tenantReady = !tenantLoading && !!currentTenant;

  const [statusFilter, setStatusFilter] = useState<"PENDING" | "PAID" | "OVERDUE" | undefined>(
    undefined,
  );

  const { data, isLoading } = api.partnerInvoice.list.useQuery(
    { status: statusFilter, limit: 50 },
    { enabled: tenantReady },
  );

  const { data: summary } = api.partnerInvoice.summary.useQuery(undefined, {
    enabled: tenantReady,
  });

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  if (tenantLoading || isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie repasses e comissões de parceiros
          </p>
        </div>
        <Link href="/dashboard/partners">
          <Button variant="outline">← Parceiros</Button>
        </Link>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-bold">{summary.totalPaid}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{summary.totalPending}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{summary.totalOverdue}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {formatCurrency(summary.totalAmountPending)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) =>
            setStatusFilter(value === "all" ? undefined : (value as "PENDING" | "PAID" | "OVERDUE"))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="PAID">Pagas</SelectItem>
            <SelectItem value="OVERDUE">Vencidas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        searchKey="partner.name"
        searchPlaceholder="Buscar por parceiro..."
        title="Lista de Contas a Pagar"
        description={`${total} ${total === 1 ? "registro encontrado" : "registros encontrados"}`}
      />
    </div>
  );
}
