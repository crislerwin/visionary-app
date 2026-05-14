"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, subMonths } from "date-fns";
import {
  ArrowUpRight,
  Calendar as CalendarIcon,
  DollarSign,
  Filter,
  HandCoins,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

function pct(a: number, b: number) {
  return b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100;
}

// ── Filters state ──

interface DashboardFilters {
  bankAccountIds: string[];
  partnerIds: string[];
  categoryIds: string[];
}

function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFilters>({
    bankAccountIds: [],
    partnerIds: [],
    categoryIds: [],
  });

  const toggle = (key: keyof DashboardFilters, id: string) => {
    setFilters((prev) => {
      const arr = prev[key];
      const has = arr.includes(id);
      return { ...prev, [key]: has ? arr.filter((x) => x !== id) : [...arr, id] };
    });
  };

  const clear = () => setFilters({ bankAccountIds: [], partnerIds: [], categoryIds: [] });

  const hasAny =
    filters.bankAccountIds.length > 0 ||
    filters.partnerIds.length > 0 ||
    filters.categoryIds.length > 0;

  return { filters, toggle, clear, hasAny };
}

// ── Main component ──

export function DashboardClient() {
  const { t } = useTranslation("dashboard");
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const tenantReady = !tenantLoading && !!currentTenant;

  const now = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(subMonths(now, 11)),
    to: now,
  });

  const { filters, toggle, clear, hasAny } = useDashboardFilters();

  // Reference data for filter selects
  const { data: bankAccounts } = api.bankAccount.list.useQuery(undefined, { enabled: tenantReady });
  const { data: partners } = api.partner.list.useQuery(undefined, { enabled: tenantReady });
  const { data: categories } = api.category.list.useQuery({ limit: 100 }, { enabled: tenantReady });

  // Main queries with filters
  const { data: monthlyStats, isLoading: statsLoading } = api.transaction.getMonthlyStats.useQuery(
    {
      startDate: dateRange.from,
      endDate: dateRange.to,
      bankAccountIds: filters.bankAccountIds,
      partnerIds: filters.partnerIds,
      categoryIds: filters.categoryIds,
    },
    { enabled: tenantReady },
  );

  // Balance: filtered by bank accounts if selected, otherwise global
  const { data: filteredBalance, isLoading: balanceLoading } =
    api.bankAccount.getTotalBalance.useQuery(undefined, {
      enabled: tenantReady && filters.bankAccountIds.length === 0,
    });

  const { data: accountBalances, isLoading: accountBalanceLoading } = api.bankAccount.list.useQuery(
    undefined,
    { enabled: tenantReady && filters.bankAccountIds.length > 0 },
  );

  // Partner invoice summary
  const { data: payablesSummary } = api.partnerInvoice.summary.useQuery(undefined, {
    enabled: tenantReady,
  });

  // Top partner (use performance with period filter)
  const { data: partnerPerf } = api.partner.performance.useQuery(
    { period: "year", sortBy: "profit" },
    { enabled: tenantReady },
  );

  const isLoading = statsLoading || balanceLoading || accountBalanceLoading || tenantLoading;

  // Calculate saldo based on filter
  const saldo = useMemo(() => {
    if (filters.bankAccountIds.length === 0) {
      return filteredBalance?.totalBalance ?? 0;
    }
    const selected = accountBalances?.filter((a) => filters.bankAccountIds.includes(a.id)) ?? [];
    return selected.reduce((sum, a) => sum + Number(a.currentBalance ?? 0), 0);
  }, [filteredBalance, accountBalances, filters.bankAccountIds]);

  // Balance label
  const balanceLabel = useMemo(() => {
    if (filters.bankAccountIds.length === 0) return t("currentBalance");
    if (filters.bankAccountIds.length === 1) {
      const name = bankAccounts?.find((a) => a.id === filters.bankAccountIds[0])?.name ?? "";
      return name ? t("balanceOf", { name }) : t("selectedBalance");
    }
    return t("selectedBalance");
  }, [filters.bankAccountIds, bankAccounts, t]);

  // Chart data
  const balanceSeries = monthlyStats?.balanceSeries ?? [];
  const compareSeries = monthlyStats?.compareSeries ?? [];

  // KPI values
  const cards = useMemo(() => {
    const totalReceitas = compareSeries.reduce((sum, m) => sum + (m.receitas ?? 0), 0);
    const totalDespesas = compareSeries.reduce((sum, m) => sum + (m.despesas ?? 0), 0);
    const totalLucro = totalReceitas - totalDespesas;

    const mid = Math.floor(compareSeries.length / 2);
    const firstHalfReceitas = compareSeries
      .slice(0, mid)
      .reduce((sum, m) => sum + (m.receitas ?? 0), 0);
    const secondHalfReceitas = compareSeries
      .slice(mid)
      .reduce((sum, m) => sum + (m.receitas ?? 0), 0);
    const firstHalfDespesas = compareSeries
      .slice(0, mid)
      .reduce((sum, m) => sum + (m.despesas ?? 0), 0);
    const secondHalfDespesas = compareSeries
      .slice(mid)
      .reduce((sum, m) => sum + (m.despesas ?? 0), 0);

    const firstHalfSaldo = balanceSeries[0]?.saldo ?? 0;
    const lastHalfSaldo = balanceSeries[balanceSeries.length - 1]?.saldo ?? 0;

    return {
      saldo,
      saldoDelta: pct(lastHalfSaldo, firstHalfSaldo),
      receitas: totalReceitas,
      receitasDelta: pct(secondHalfReceitas, firstHalfReceitas),
      despesas: totalDespesas,
      despesasDelta: pct(secondHalfDespesas, firstHalfDespesas),
      lucro: totalLucro,
      lucroDelta: pct(totalLucro, firstHalfReceitas - firstHalfDespesas),
    };
  }, [balanceSeries, compareSeries, saldo]);

  // Top partner
  const topPartner = partnerPerf?.partners?.[0];

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

        <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={String(i)} className="py-3">
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

        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {["chart-a", "chart-b"].map((key) => (
            <Card key={key} className="min-h-0 py-2">
              <CardHeader className="px-3 pb-1 pt-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-0.5 h-3 w-36" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0">
                <Skeleton className="h-[140px] w-full sm:h-[170px]" />
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
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("overview")}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("overviewDescription")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker range={dateRange} onChange={setDateRange} />

          {/* Filters */}
          <FilterPopover
            label={t("filters.bankAccount")}
            allLabel={t("filters.allAccounts")}
            items={bankAccounts?.map((a) => ({ id: a.id, label: a.name })) ?? []}
            selected={filters.bankAccountIds}
            onToggle={(id) => toggle("bankAccountIds", id)}
          />

          <FilterPopover
            label={t("filters.partner")}
            allLabel={t("filters.allPartners")}
            items={partners?.map((p) => ({ id: p.id, label: p.name })) ?? []}
            selected={filters.partnerIds}
            onToggle={(id) => toggle("partnerIds", id)}
          />

          <FilterPopover
            label={t("filters.category")}
            allLabel={t("filters.allCategories")}
            items={categories?.categories?.map((c) => ({ id: c.id, label: c.name })) ?? []}
            selected={filters.categoryIds}
            onToggle={(id) => toggle("categoryIds", id)}
          />

          {hasAny && (
            <Button variant="ghost" size="sm" onClick={clear} className="h-8 px-2 text-[11px]">
              <X className="mr-1 h-3 w-3" />
              {t("filters.clear")}
            </Button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {hasAny && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filters.bankAccountIds.map((id) => {
            const name = bankAccounts?.find((a) => a.id === id)?.name ?? id;
            return (
              <Badge key={id} variant="secondary" className="gap-1 px-2 py-0.5 text-[11px]">
                {name}
                <button
                  onClick={() => toggle("bankAccountIds", id)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {filters.partnerIds.map((id) => {
            const name = partners?.find((p) => p.id === id)?.name ?? id;
            return (
              <Badge key={id} variant="secondary" className="gap-1 px-2 py-0.5 text-[11px]">
                {name}
                <button onClick={() => toggle("partnerIds", id)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {filters.categoryIds.map((id) => {
            const name = categories?.categories?.find((c) => c.id === id)?.name ?? id;
            return (
              <Badge key={id} variant="secondary" className="gap-1 px-2 py-0.5 text-[11px]">
                {name}
                <button
                  onClick={() => toggle("categoryIds", id)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title={balanceLabel}
          value={currency(cards.saldo)}
          delta={cards.saldoDelta}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          title={t("periodIncome")}
          value={currency(cards.receitas)}
          delta={cards.receitasDelta}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title={t("periodExpense")}
          value={currency(cards.despesas)}
          delta={cards.despesasDelta}
          invertDelta
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          title={cards.lucro >= 0 ? t("periodProfit") : t("periodLoss")}
          value={currency(cards.lucro)}
          delta={cards.lucroDelta}
          icon={<DollarSign className="h-4 w-4" />}
        />

        {/* Pending payables card */}
        <Card className="cursor-pointer py-2 transition-colors hover:bg-accent/50">
          <Link href="/dashboard/partner-invoices?status=PENDING" className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0.5 pt-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("pendingPayables")}
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                <HandCoins className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-2 pt-0">
              <div className="text-2xl font-semibold tracking-tight text-foreground">
                {currency(payablesSummary?.totalAmountPending ?? 0)}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span>{payablesSummary?.totalPending ?? 0} pendentes</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Top partner card */}
        <Card className="cursor-pointer py-2 transition-colors hover:bg-accent/50">
          {topPartner ? (
            <Link href={`/dashboard/partners/performance?id=${topPartner.id}`} className="block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0.5 pt-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("topPartner")}
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  <UserCheck className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-2 pt-0">
                <div className="text-xl font-semibold tracking-tight text-foreground truncate">
                  {topPartner.name}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs">
                  <span
                    className={cn(
                      "font-medium",
                      topPartner.netProfit >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {currency(topPartner.netProfit)}
                  </span>
                  <span className="text-muted-foreground">lucro</span>
                </div>
              </CardContent>
            </Link>
          ) : (
            <CardContent className="px-4 py-4">
              <div className="text-sm text-muted-foreground">{t("noResults")}</div>
            </CardContent>
          )}
        </Card>
      </section>

      <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="min-h-0 py-2">
          <CardHeader className="px-3 pb-1 pt-0">
            <CardTitle className="text-sm">{t("charts.balanceEvolution")}</CardTitle>
            <CardDescription className="text-xs">Período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0">
            <ChartContainer config={balanceChartConfig} className="h-[140px] w-full sm:h-[170px]">
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

        <Card className="min-h-0 py-2">
          <CardHeader className="px-3 pb-1 pt-0">
            <CardTitle className="text-sm">{t("charts.incomeVsExpense")}</CardTitle>
            <CardDescription className="text-xs">Período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0">
            <ChartContainer config={compareChartConfig} className="h-[140px] w-full sm:h-[170px]">
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

      <TransactionsTable dateRange={dateRange} filters={filters} />
    </>
  );
}

// ── Filter Popover ──

function FilterPopover({
  label,
  allLabel,
  items,
  selected,
  onToggle,
}: {
  label: string;
  allLabel: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1 text-[11px]", selected.length > 0 && "border-primary")}
        >
          <Filter className="h-3 w-3" />
          {selected.length > 0 ? `${label} (${selected.length})` : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {items.length === 0 ? (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">{allLabel}</div>
          ) : (
            items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12px] hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(item.id)}
                  onCheckedChange={() => onToggle(item.id)}
                  className="size-3.5"
                />
                <span className="truncate">{item.label}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Isolated Transactions Table ──

import { DataTable } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { TransactionStatus, TransactionType } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";

interface TransactionRow {
  id: string;
  description: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  bankName: string;
  accountName: string;
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
    accessorKey: "bankName",
    header: "Banco",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("bankName")}</span>,
  },
  {
    accessorKey: "accountName",
    header: "Conta",
    cell: ({ row }) => <span className="font-medium">{row.getValue("accountName")}</span>,
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

function TransactionsTable({
  dateRange,
  filters,
}: {
  dateRange: { from: Date; to: Date };
  filters: DashboardFilters;
}) {
  const { t } = useTranslation("dashboard");
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const tenantReady = !tenantLoading && !!currentTenant;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const [typeFilter, setTypeFilter] = useState<TransactionType | undefined>();
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | undefined>();

  // Local table filters (single-select for simplicity, matching server-side)
  // Using the first selected from global filters or undefined
  const bankAccountId = filters.bankAccountIds[0];
  const categoryId = filters.categoryIds[0];
  const partnerId = filters.partnerIds[0];

  const { data: transactionsData, isLoading: txLoading } = api.transaction.list.useQuery(
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      startDate: dateRange.from,
      endDate: dateRange.to,
      type: typeFilter,
      status: statusFilter,
      bankAccountId,
      categoryId,
      partnerId,
    },
    { enabled: tenantReady },
  );

  const transactions: TransactionRow[] = useMemo(() => {
    return (
      transactionsData?.transactions.map((t) => ({
        id: t.id,
        description: t.description ?? "—",
        date: formatDate(new Date(t.date)),
        amount: typeof t.amount === "string" ? Number(t.amount) : t.amount,
        type: t.type,
        category: t.category?.name ?? "—",
        bankName: t.bankAccount?.bankName ?? "—",
        accountName: t.bankAccount?.name ?? "—",
        status: t.status,
      })) ?? []
    );
  }, [transactionsData]);

  const txTotal = transactionsData?.total ?? 0;
  const txPageCount = Math.ceil(txTotal / pagination.pageSize) || 1;

  return (
    <section className="mt-3 min-w-0">
      <Card className="min-h-0 min-w-0 overflow-hidden py-3">
        <CardContent className="min-w-0 px-4 pb-3 pt-0">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight">
                {t("table.latestTransactions")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("table.recentPeriod")}</p>
            </div>
            {/* Inline table filters */}
            <div className="flex flex-wrap gap-1.5">
              <select
                value={typeFilter ?? ""}
                onChange={(e) =>
                  setTypeFilter(e.target.value ? (e.target.value as TransactionType) : undefined)
                }
                className="h-7 rounded border bg-background px-2 text-[11px]"
              >
                <option value="">{t("table.allTypes")}</option>
                <option value={TransactionType.INCOME}>{t("table.income")}</option>
                <option value={TransactionType.EXPENSE}>{t("table.expense")}</option>
              </select>
              <select
                value={statusFilter ?? ""}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value ? (e.target.value as TransactionStatus) : undefined,
                  )
                }
                className="h-7 rounded border bg-background px-2 text-[11px]"
              >
                <option value="">{t("table.status")}</option>
                <option value={TransactionStatus.COMPLETED}>Concluído</option>
                <option value={TransactionStatus.PENDING}>Pendente</option>
              </select>
            </div>
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block">
            {txLoading ? (
              <div className="space-y-2 rounded-md border p-2">
                {Array.from({ length: pagination.pageSize }).map((_, i) => (
                  <Skeleton key={String(i)} className="h-10 w-full" />
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <DataTable
                columns={transactionColumns}
                data={transactions}
                searchKey="description"
                searchPlaceholder={t("table.searchPlaceholder")}
                manualPagination
                pageCount={txPageCount}
                pagination={pagination}
                onPaginationChange={setPagination}
                totalRows={txTotal}
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
  );
}

// ── Helpers ──

function DateRangePicker({
  range,
  onChange,
}: {
  range: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>(range);
  const [months, setMonths] = useState(1);

  useEffect(() => {
    const handleResize = () => setMonths(window.innerWidth >= 640 ? 2 : 1);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleApply = () => {
    if (draft.from && draft.to) {
      onChange({ from: draft.from, to: draft.to });
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setDraft(range);
    setOpen(false);
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start">
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          if (isOpen) setDraft(range);
          setOpen(isOpen);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("justify-start text-left font-normal", !range && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {range?.from ? (
              range.to ? (
                <>
                  {format(range.from, "dd/MM/yyyy")} - {format(range.to, "dd/MM/yyyy")}
                </>
              ) : (
                format(range.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-3">
            <Calendar
              key={`${range.from.toISOString()}-${range.to.toISOString()}`}
              initialFocus
              mode="range"
              defaultMonth={draft?.from ?? range.from}
              selected={{
                from: draft?.from,
                to: draft?.to,
              }}
              onSelect={(selected) => {
                setDraft({
                  from: selected?.from,
                  to: selected?.to,
                });
              }}
              numberOfMonths={months}
            />
            <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleApply} disabled={!draft.from || !draft.to}>
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
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
    <Card className="py-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0.5 pt-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-2 pt-0">
        <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs">
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
          <span className="text-muted-foreground">vs metade anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}
