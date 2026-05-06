"use client";

import { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import {
    ArrowDownRight,
    ArrowUpRight,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react";

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

    const pct = (a: number, b: number) =>
        b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100;

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

export function DashboardClient() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());

    const data = useMemo(() => buildData(month, year), [month, year]);
    const { cards } = data;

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

    return (
        <main className="min-h-screen bg-muted/30">
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
                    <Select
                        value={String(month)}
                        onValueChange={(v) => setMonth(Number(v))}
                    >
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

                    <Select
                        value={String(year)}
                        onValueChange={(v) => setYear(Number(v))}
                    >
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
                    title={
                        cards.lucro >= 0 ? "Lucro do Mês" : "Prejuízo do Mês"
                    }
                    value={currency(cards.lucro)}
                    delta={cards.lucroDelta}
                    icon={<DollarSign className="h-4 w-4" />}
                />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Evolução do Saldo</CardTitle>
                        <CardDescription>Últimos 12 meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={balanceChartConfig}
                            className="aspect-[16/10] w-full"
                        >
                            <AreaChart
                                data={data.balanceSeries}
                                margin={{ left: 4, right: 12, top: 8 }}
                            >
                                <defs>
                                    <linearGradient
                                        id="fillSaldo"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="var(--color-saldo)"
                                            stopOpacity={0.4}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--color-saldo)"
                                            stopOpacity={0.05}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={56}
                                    tickFormatter={(v) =>
                                        `${Math.round(Number(v) / 1000)}k`
                                    }
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) =>
                                                currency(Number(value))
                                            }
                                        />
                                    }
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

                <Card>
                    <CardHeader>
                        <CardTitle>Receitas vs Despesas</CardTitle>
                        <CardDescription>Comparativo mensal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={compareChartConfig}
                            className="aspect-[16/10] w-full"
                        >
                            <BarChart
                                data={data.compareSeries}
                                margin={{ left: 4, right: 12, top: 8 }}
                            >
                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={56}
                                    tickFormatter={(v) =>
                                        `${Math.round(Number(v) / 1000)}k`
                                    }
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name) =>
                                                `${name}: ${currency(Number(value))}`
                                            }
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar
                                    dataKey="receitas"
                                    fill="var(--color-receitas)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="despesas"
                                    fill="var(--color-despesas)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </section>
        </main>
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                    {value}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs">
                    <span
                        className={
                            isPositive
                                ? "inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400"
                                : "inline-flex items-center gap-0.5 font-medium text-rose-600 dark:text-rose-400"
                        }
                    >
                        {isUp ? (
                            <ArrowUpRight className="h-3 w-3" />
                        ) : (
                            <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(delta).toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">
                        vs mês anterior
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
