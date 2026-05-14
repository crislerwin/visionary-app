"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/trpc/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

interface ForecastRow {
  id: string;
  dueDate: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  bankAccount: { id: string; name: string };
  category: { id: string; name: string; color: string } | null;
}

function fmtCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const forecastColumns: ColumnDef<ForecastRow>[] = [
  {
    accessorKey: "dueDate",
    header: "Vencimento",
    cell: ({ row }) => (
      <span className="text-[11px] tabular-nums">
        {format(new Date(row.original.dueDate), "dd/MM/yyyy", { locale: ptBR })}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) =>
      row.original.type === "INCOME" ? (
        <div className="flex items-center gap-1 text-emerald-600">
          <ArrowDownLeft className="h-3 w-3" />
          <span className="text-[11px]">Receita</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-rose-600">
          <ArrowUpRight className="h-3 w-3" />
          <span className="text-[11px]">Despesa</span>
        </div>
      ),
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => <span className="text-[12px]">{row.original.description}</span>,
  },
  {
    accessorKey: "amount",
    header: "Valor",
    cell: ({ row }) => (
      <span
        className={`text-[11px] font-medium tabular-nums ${
          row.original.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {fmtCurrency(Number(row.original.amount))}
      </span>
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
    accessorKey: "category",
    header: "Categoria",
    cell: ({ row }) =>
      row.original.category ? (
        <Badge
          variant="outline"
          style={{ borderColor: row.original.category.color, color: row.original.category.color }}
          className="text-[10px]"
        >
          {row.original.category.name}
        </Badge>
      ) : (
        <span className="text-[10px] text-muted-foreground">—</span>
      ),
  },
];

export default function CashflowForecastPage() {
  const [months, setMonths] = useState(6);
  const { data: projection, isLoading: projectionLoading } = api.transaction.projection.useQuery({
    months,
  });
  const { data: forecast, isLoading: forecastLoading } = api.transaction.forecast.useQuery({});

  const chartBars = useMemo(() => {
    if (!projection?.series) return [];
    const maxAbs = Math.max(...projection.series.map((s) => Math.abs(s.saldo)), 1);
    return projection.series.map((s) => ({
      ...s,
      barHeight: `${(Math.abs(s.saldo) / maxAbs) * 100}%`,
      isNegative: s.saldo < 0,
    }));
  }, [projection]);

  return (
    <div className="space-y-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-semibold">Previsão de Caixa</h1>
          <p className="text-[11px] text-muted-foreground">
            Projeção de saldo com transações agendadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={months.toString()} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="h-7 w-32 text-[11px]">
              <CalendarDays className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards — ultra compact */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border p-2">
          <p className="text-[10px] text-muted-foreground">Saldo Atual</p>
          <p className="text-[13px] font-semibold tabular-nums">
            {projection ? fmtCurrency(projection.currentBalance) : "—"}
          </p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-[10px] text-muted-foreground">Saldo Projetado</p>
          <p
            className={`text-[13px] font-semibold tabular-nums ${
              projection && projection.projectedEndBalance >= 0
                ? "text-emerald-600"
                : "text-rose-600"
            }`}
          >
            {projection ? fmtCurrency(projection.projectedEndBalance) : "—"}
          </p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-[10px] text-muted-foreground">Transações Pendentes</p>
          <p className="text-[13px] font-semibold tabular-nums">{projection?.pendingCount ?? 0}</p>
        </div>
      </div>

      {/* Projection Chart */}
      {projectionLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : chartBars.length > 0 ? (
        <div className="rounded-md border p-2">
          <p className="text-[11px] font-medium mb-2">Projeção Mensal</p>
          <div className="flex items-end gap-1 h-32">
            {chartBars.map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm ${
                    bar.isNegative ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ height: bar.barHeight }}
                />
                <span className="text-[9px] text-muted-foreground uppercase">{bar.month}</span>
                <span
                  className={`text-[10px] font-medium tabular-nums ${bar.isNegative ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {fmtCurrency(bar.saldo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Pending transactions table */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-medium">Transações Agendadas</p>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>
              Receitas:{" "}
              <strong className="text-emerald-600">
                {forecast ? fmtCurrency(forecast.totalIncome) : "—"}
              </strong>
            </span>
            <span>
              Despesas:{" "}
              <strong className="text-rose-600">
                {forecast ? fmtCurrency(forecast.totalExpense) : "—"}
              </strong>
            </span>
            <span>
              Saldo:{" "}
              <strong
                className={
                  forecast && forecast.netChange >= 0 ? "text-emerald-600" : "text-rose-600"
                }
              >
                {forecast ? fmtCurrency(forecast.netChange) : "—"}
              </strong>
            </span>
          </div>
        </div>

        {forecastLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : forecast?.transactions && forecast.transactions.length > 0 ? (
          <DataTable
            columns={forecastColumns}
            data={forecast.transactions as unknown as ForecastRow[]}
            pagination={{ pageIndex: 0, pageSize: 50 }}
            loading={false}
          />
        ) : (
          <div className="rounded-md border p-4 text-center">
            <p className="text-[12px] text-muted-foreground">
              Nenhuma transação agendada para o período.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Crie transações com status "Pendente" e uma data de vencimento para aparecerem aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
