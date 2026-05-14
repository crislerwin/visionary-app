"use client";

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
import { api } from "@/lib/trpc/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { TransactionForm } from "../../../components/transactions/TransactionForm";

interface TransactionRow {
  id: string;
  date: Date;
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: number;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  bankAccount: { id: string; name: string; bankName: string | null; currency: string };
  category: { id: string; name: string; color: string; icon: string } | null;
}

function fmtCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

const columns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "date",
    header: "Data",
    cell: ({ row }) => (
      <span className="text-[11px] tabular-nums">
        {format(new Date(row.original.date), "dd/MM/yyyy", { locale: ptBR })}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) =>
      row.original.type === "INCOME" ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <ArrowUpRight className="h-3 w-3" /> Entrada
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500">
          <ArrowDownLeft className="h-3 w-3" /> Saída
        </span>
      ),
  },
  {
    accessorKey: "category",
    header: "Categoria",
    cell: ({ row }) => {
      const cat = row.original.category;
      if (!cat) return <span className="text-[11px] text-muted-foreground">—</span>;
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
          <span className="text-[11px]">{cat.name}</span>
        </span>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => (
      <span className="text-[11px] truncate max-w-[200px] block">{row.original.description}</span>
    ),
  },
  {
    accessorKey: "bankAccount",
    header: "Conta",
    cell: ({ row }) => (
      <span className="text-[11px] text-muted-foreground">{row.original.bankAccount.name}</span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Valor",
    cell: ({ row }) => (
      <span
        className={`text-[11px] tabular-nums font-medium ${
          row.original.type === "INCOME" ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {row.original.type === "INCOME" ? "+" : "-"}
        {fmtCurrency(row.original.amount, row.original.bankAccount.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      const variant = s === "COMPLETED" ? "default" : s === "PENDING" ? "outline" : "secondary";
      const label = s === "COMPLETED" ? "Concluído" : s === "PENDING" ? "Pendente" : "Cancelado";
      return (
        <Badge variant={variant} className="text-[10px] px-1.5 py-0">
          {label}
        </Badge>
      );
    },
  },
];

export default function TransactionsPage() {
  const { currentTenant } = useCurrentTenant();
  const tenantId = currentTenant?.id;
  const utils = api.useUtils();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filterType, setFilterType] = useState<"" | "INCOME" | "EXPENSE">("");
  const [filterStatus, setFilterStatus] = useState<"" | "COMPLETED" | "PENDING" | "CANCELLED">("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);

  const { data: txData } = api.transaction.list.useQuery(
    {
      type: (filterType || undefined) as "INCOME" | "EXPENSE" | undefined,
      status: (filterStatus || undefined) as "COMPLETED" | "PENDING" | "CANCELLED" | undefined,
      categoryId: filterCategory || undefined,
      page,
      pageSize,
    },
    { enabled: !!tenantId },
  );

  const { data: categories } = api.category.list.useQuery({}, { enabled: !!tenantId });
  const deleteMutation = api.transaction.delete.useMutation({
    onSuccess: () => {
      utils.transaction.list.invalidate();
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const rows: TransactionRow[] = useMemo(
    () =>
      (txData?.transactions?.map((t) => ({
        ...t,
        date: new Date(t.date),
        amount: Number(t.amount),
      })) as TransactionRow[]) ?? [],
    [txData],
  );
  const total = txData?.total ?? 0;

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta transação?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
    } catch {
      // handled by onError
    }
  };

  void handleDelete;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-[13px] font-semibold">Extrato</h1>
          </div>
          <Button size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nova
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="h-7 w-32 text-[11px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="INCOME">Entrada</SelectItem>
              <SelectItem value="EXPENSE">Saída</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
          >
            <SelectTrigger className="h-7 w-32 text-[11px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="COMPLETED">Concluído</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v)}>
            <SelectTrigger className="h-7 w-36 text-[11px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {categories?.categories?.map((c: { id: string; name: string }) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <DataTable
          columns={columns}
          data={rows}
          manualPagination
          pageCount={Math.ceil(total / pageSize)}
          pagination={{ pageIndex: page - 1, pageSize }}
          onPaginationChange={({ pageIndex, pageSize: ps }) => {
            setPage(pageIndex + 1);
            setPageSize(ps);
          }}
          totalRows={total}
        />
      </div>

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
