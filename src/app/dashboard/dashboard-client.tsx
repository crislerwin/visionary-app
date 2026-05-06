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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  status: "COMPLETED" | "PENDING";
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildData(month: number, year: number) {
  const rand = seeded(year * 100 + month + 1);

  const balanceSeries = Array.from({ length: 12 }, (_, i) => {
    const idx = (month + 1 + i) % 12;
    const base = 80000 + i * 4500 + rand() * 20000;
    return {
      month: SHORT_MONTHS[idx],
      saldo: Math.round(base),
    };
  });

  const compareSeries = Array.from({ length: 12 }, (_, i) => {
    const idx = (month + 1 + i) % 12;
    const receitas = Math.round(40000 + rand() * 35000);
    const despesas = Math.round(25000 + rand() * 28000);
    return {
      month: SHORT_MONTHS[idx],
      receitas,
      despesas,
    };
  });

  const last = compareSeries[compareSeries.length - 1];
  const prev = compareSeries[compareSeries.length - 2];

  const saldo = balanceSeries[balanceSeries.length - 1].saldo;
  const saldoPrev = balanceSeries[balanceSeries.length - 2].saldo;
  const lucro = last.receitas - last.despesas;
  const lucroPrev = prev.receitas - prev.despesas;

  const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100);

  return {
    balanceSeries,
    compareSeries,
    cards: {
      saldo,
      saldoDelta: pct(saldo, saldoPrev),
      receitas: last.receitas,
      receitasDelta: pct(last.receitas, prev.receitas),
      despesas: last.despesas,
      despesasDelta: pct(last.despesas, prev.despesas),
      lucro,
      lucroDelta: pct(lucro, lucroPrev),
    },
  };
}

const balanceChartConfig = {
  saldo: { label: "Saldo", color: "var(--chart-1)" },
} satisfies ChartConfig;

const compareChartConfig = {
  receitas: { label: "Receitas", color: "var(--chart-2)" },
  despesas: { label: "Despesas", color: "var(--chart-5)" },
} satisfies ChartConfig;

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", description: "Salário mensal", date: "06/05/2026", amount: 8500.0, type: "INCOME", category: "Salário", status: "COMPLETED" },
  { id: "2", description: "Aluguel apartamento", date: "05/05/2026", amount: 2200.0, type: "EXPENSE", category: "Moradia", status: "COMPLETED" },
  { id: "3", description: "Supermercado Extra", date: "04/05/2026", amount: 680.5, type: "EXPENSE", category: "Alimentação", status: "COMPLETED" },
  { id: "4", description: "Freelance projeto web", date: "03/05/2026", amount: 3200.0, type: "INCOME", category: "Freelance", status: "PENDING" },
  { id: "5", description: "Uber / 99", date: "02/05/2026", amount: 145.8, type: "EXPENSE", category: "Transporte", status: "COMPLETED" },
  { id: "6", description: "Netflix + Spotify", date: "01/05/2026", amount: 59.9, type: "EXPENSE", category: "Lazer", status: "COMPLETED" },
  { id: "7", description: "Dividendos FIIs", date: "30/04/2026", amount: 420.0, type: "INCOME", category: "Investimentos", status: "COMPLETED" },
  { id: "8", description: "Farmácia", date: "29/04/2026", amount: 210.35, type: "EXPENSE", category: "Saúde", status: "COMPLETED" },
];

const transactionColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("description")}</span>
    ),
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
            type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
          )}
        >
          {type === "INCOME" ? "+" : "-"}
          {currency(amount)}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
          )}
        >
          {status === "COMPLETED" ? "Concluído" : "Pendente"}
        </span>
      );
    },
  },
];

export function DashboardClient() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const data = useMemo(() => buildData(month, year), [month, year]);
  const { cards } = data;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

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

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px] bg-background">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <AreaChart data={data.balanceSeries} margin={{ left: 4, right: 12, top: 8 }}>
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
              <BarChart data={data.compareSeries} margin={{ left: 4, right: 12, top: 8 }}>
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
              <DataTable
                columns={transactionColumns}
                data={MOCK_TRANSACTIONS}
                searchKey="description"
                searchPlaceholder="Buscar transação..."
              />
            </div>

            {/* Mobile: lista de cards */}
            <div className="space-y-2 md:hidden">
              {MOCK_TRANSACTIONS.map((t) => (
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
                          t.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                        )}
                      >
                        {t.status === "COMPLETED" ? "OK" : "PEN"}
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
                      t.type === "INCOME"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {t.type === "INCOME" ? "+" : "-"}
                    {currency(t.amount)}
                  </span>
                </div>
              ))}
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
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs mês anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}
