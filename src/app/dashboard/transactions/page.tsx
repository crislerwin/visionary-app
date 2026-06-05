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
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TransactionForm } from "../../../components/transactions/TransactionForm";

interface TransactionRow {
  id: string;
  date: Date;
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: number;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  bankAccount: {
    id: string;
    name: string;
    bankName: string | null;
    currency: string;
  };
  category: { id: string; name: string; color: string; icon: string } | null;
}

function fmtCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function useTransactionColumns(t: (key: string) => string): ColumnDef<TransactionRow>[] {
  return useMemo(
    () => [
      {
        accessorKey: "date",
        header: t("table.date"),
        cell: ({ row }) => (
          <span className="text-[11px] tabular-nums">
            {format(new Date(row.original.date), "dd/MM/yyyy", {
              locale: ptBR,
            })}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: t("table.type"),
        cell: ({ row }) =>
          row.original.type === "INCOME" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <ArrowUpRight className="h-3 w-3" /> {t("type.income")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500">
              <ArrowDownLeft className="h-3 w-3" /> {t("type.expense")}
            </span>
          ),
      },
      {
        accessorKey: "category",
        header: t("table.category"),
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
        header: t("table.description"),
        cell: ({ row }) => (
          <span className="text-[11px] truncate max-w-[200px] block">
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: "bankAccount",
        header: t("table.account"),
        cell: ({ row }) => (
          <span className="text-[11px] text-muted-foreground">{row.original.bankAccount.name}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: t("table.value"),
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
        header: t("table.status"),
        cell: ({ row }) => {
          const s = row.original.status;
          const variant = s === "COMPLETED" ? "default" : s === "PENDING" ? "outline" : "secondary";
          const label =
            s === "COMPLETED"
              ? t("status.completed")
              : s === "PENDING"
                ? t("status.pending")
                : t("status.cancelled");
          return (
            <Badge variant={variant} className="text-[10px] px-1.5 py-0">
              {label}
            </Badge>
          );
        },
      },
    ],
    [t],
  );
}

export default function TransactionsPage() {
  const { t } = useTranslation("dashboard");
  const { currentTenant } = useCurrentTenant();
  const tenantId = currentTenant?.id;
  const utils = api.useUtils();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [filterType, setFilterType] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "COMPLETED" | "PENDING" | "CANCELLED">(
    "all",
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

  const columns = useTransactionColumns(t);

  const { data: txData, isLoading: txLoading } = api.transaction.list.useQuery(
    {
      type: (filterType !== "all" ? filterType : undefined) as "INCOME" | "EXPENSE" | undefined,
      status: (filterStatus !== "all" ? filterStatus : undefined) as
        | "COMPLETED"
        | "PENDING"
        | "CANCELLED"
        | undefined,
      categoryId: filterCategory !== "all" ? filterCategory : undefined,
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
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteMutation.mutateAsync({ id });
    } catch {
      // handled by onError
    }
  };

  void handleDelete;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("transactions.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("transactions.description")}</p>
        </div>
        <Button size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          {t("new")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
          <SelectTrigger className="h-7 w-32 text-[11px]">
            <SelectValue placeholder={t("table.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="INCOME">{t("type.income")}</SelectItem>
            <SelectItem value="EXPENSE">{t("type.expense")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
        >
          <SelectTrigger className="h-7 w-32 text-[11px]">
            <SelectValue placeholder={t("table.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
            <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
            <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v)}>
          <SelectTrigger className="h-7 w-36 text-[11px]">
            <SelectValue placeholder={t("table.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories?.categories?.map((c: { id: string; name: string }) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <DataTable
          columns={columns}
          data={rows}
          loading={txLoading}
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
