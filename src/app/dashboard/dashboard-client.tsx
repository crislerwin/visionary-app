"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import { cn, formatDate } from "@/lib/utils";
import { TransactionStatus, TransactionType } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

const balanceChartConfig = {
  saldo: { label: "Saldo", color: "var(--chart-1)" },
} satisfies ChartConfig;

const compareChartConfig = {
  receitas: { label: "Receitas", color: "var(--chart-2)" },
  despesas: { label: "Despesas", color: "var(--chart-5)" },
} satisfies ChartConfig;

interface TransactionRow {
  id: string;
  description: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  status: TransactionStatus;
}

const transactionColumns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>,
  },
  {
    accessorKey: "category",
    header: "Categoria",
  },
  {
    accessorKey: "date",
    header: "Data",
  },
  {
    accessorKey: "amount",
    header: "Valor",
    cell: ({ row }) => {
      const amount = Number(row.getValue("amount"));
      const type = row.original.type;
      return (
        <span
          className={cn(
            "font-medium",
            type === TransactionType.INCOME
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          {type === TransactionType.INCOME ? "+" : "-"}
          {currency(amount)}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as TransactionStatus;
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            status === TransactionStatus.COMPLETED
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
          )}
        >
          {status === TransactionStatus.COMPLETED ? "Concluído" : "Pendente"}
        </span>
      );
    },
  },
];

function pct(a: number, b: number) {
  return b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100;
}

export function DashboardClient() {
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const tenantReady = !tenantLoading && !!currentTenant;

  const { data: monthlyStats, isLoading: statsLoading } = api.transaction.getMonthlyStats.useQuery(
    { months: 12 },
    { enabled: tenantReady },
  );
  const { data: totalBalanceData, isLoading: balanceLoading } =
    api.bankAccount.getTotalBalance.useQuery(undefined, { enabled: tenantReady });

  // Latest transactions
  const { data: transactionsData, isLoading: txLoading } = api.transaction.list.useQuery(
    { limit: 8, offset: 0 },
    { enabled: tenantReady },
  );

  const isLoading = statsLoading || balanceLoading || txLoading || tenantLoading;

  // Chart data
  const balanceSeries = monthlyStats?.balanceSeries ?? [];
  const compareSeries = monthlyStats?.compareSeries ?? [];

  // KPI values
  const saldo = totalBalanceData?.totalBalance ?? 0;
  // Delta calculations using monthly stats (last month vs previous)
  const lastCompare = compareSeries[compareSeries.length - 1];
  const prevCompare = compareSeries[compareSeries.length - 2];

  const cards = useMemo(() => {
    const lastReceitas = lastCompare?.receitas ?? 0;
    const prevReceitas = prevCompare?.receitas ?? 0;
    const lastDespesas = lastCompare?.despesas ?? 0;
    const prevDespesas = prevCompare?.despesas ?? 0;
    const lastLucro = lastReceitas - lastDespesas;
    const prevLucro = prevReceitas - prevDespesas;

    const lastSaldo = balanceSeries[balanceSeries.length - 1]?.saldo ?? 0;
    const prevSaldo = balanceSeries[balanceSeries.length - 2]?.saldo ?? 0;

    return {
      saldo,
      saldoDelta: pct(lastSaldo, prevSaldo),
      receitas: lastReceitas,
      receitasDelta: pct(lastReceitas, prevReceitas),
      despesas: lastDespesas,
      despesasDelta: pct(lastDespesas, prevDespesas),
      lucro: lastLucro,
      lucroDelta: pct(lastLucro, prevLucro),
    };
  }, [balanceSeries, lastCompare, prevCompare, saldo]);

  // Format transactions for table
  const transactions: TransactionRow[] = useMemo(() => {
    return (
      transactionsData?.transactions.map((t) => ({
        id: t.id,
        description: t.description ?? "—",
        date: formatDate(new Date(t.date)),
        amount: typeof t.amount === "string" ? Number(t.amount) : t.amount,
        type: t.type,
        category: t.category?.name ?? "—",
        status: t.status,
      })) ?? []
    );
  }, [transactionsData]);

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="py-3">
              <CardHeader className="px-4 pb-1 pt-0">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="min-h-0 py-3">
              <CardHeader className="px-4 pb-2 pt-0">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-1 h-4 w-40" />
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <Skeleton className="h-[260px] w-full sm:h-[300px]" />
              </CardContent>
            </Card>
          ))}
        </section>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Visão geral
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus principais indicadores financeiros
          </p>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Saldo Atual"
          value={currency(cards.saldo)}
          delta={cards.saldoDelta}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          title="Receitas do Mês"
          value={currency(cards.receitas)}
          delta={cards.receitasDelta}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="Despesas do Mês"
          value={currency(cards.despesas)}
          delta={cards.despesasDelta}
          invertDelta
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          title={cards.lucro >= 0 ? "Lucro do Mês" : "Prejuízo do Mês"}
          value={currency(cards.lucro)}
          delta={cards.lucroDelta}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-h-0 py-3">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle>Evolução do Saldo</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <ChartContainer config={balanceChartConfig} className="h-[260px] w-full sm:h-[300px]">
              <AreaChart data={balanceSeries} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-saldo)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-saldo)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => currency(Number(value))} />}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="var(--color-saldo)"
                  strokeWidth={2}
                  fill="url(#fillSaldo)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="min-h-0 py-3">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle>Receitas vs Despesas</CardTitle>
            <CardDescription>Comparativo mensal</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <ChartContainer config={compareChartConfig} className="h-[260px] w-full sm:h-[300px]">
              <BarChart data={compareSeries} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => `${name}: ${currency(Number(value))}`}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="receitas" fill="var(--color-receitas)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="var(--color-despesas)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 min-w-0">
        <Card className="min-h-0 min-w-0 overflow-hidden py-3">
          <CardContent className="min-w-0 px-4 pb-3 pt-0">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight">Últimas Transações</h3>
                <p className="text-sm text-muted-foreground">Transações recentes do período</p>
              </div>
            </div>

            {/* Desktop: tabela */}
            <div className="hidden md:block">
              {transactions.length > 0 ? (
                <DataTable
                  columns={transactionColumns}
                  data={transactions}
                  searchKey="description"
                  searchPlaceholder="Buscar transação..."
                />
              ) : (
                <div className="rounded-md border py-8 text-center text-sm text-muted-foreground">
                  Nenhuma transação encontrada.
                </div>
              )}
            </div>

            {/* Mobile: lista de cards */}
            <div className="space-y-2 md:hidden">
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{t.description}</span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                            t.status === TransactionStatus.COMPLETED
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          )}
                        >
                          {t.status === TransactionStatus.COMPLETED ? "OK" : "PEN"}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{t.date}</span>
                        <span className="text-border">·</span>
                        <span className="truncate">{t.category}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "ml-3 shrink-0 text-sm font-semibold tabular-nums",
                        t.type === TransactionType.INCOME
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {t.type === TransactionType.INCOME ? "+" : "-"}
                      {currency(t.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-md border py-8 text-center text-sm text-muted-foreground">
                  Nenhuma transação encontrada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function KpiCard({
  title,
  value,
  delta,
  icon,
  invertDelta = false,
}: {
  title: string;
  value: string;
  delta: number;
  icon: React.ReactNode;
  invertDelta?: boolean;
}) {
  const isUp = delta >= 0;
  const isPositive = invertDelta ? !isUp : isUp;
  return (
    <Card className="py-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 pt-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span
            className={
              isPositive
                ? "inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400"
                : "inline-flex items-center gap-0.5 font-medium text-rose-600 dark:text-rose-400"
            }
          >
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs mês anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}
