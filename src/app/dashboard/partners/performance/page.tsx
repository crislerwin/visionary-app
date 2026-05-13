"use client";

import { useState } from "react";
import { PartnerPerformanceTable } from "@/components/partners/PartnerPerformanceTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TrendingUp, TrendingDown, ArrowLeftRight, Users, Receipt } from "lucide-react";
import Link from "next/link";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function PartnerPerformancePage() {
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const tenantReady = !tenantLoading && !!currentTenant;

  const [sortBy, setSortBy] = useState<"profit" | "volume">("profit");
  const [period, setPeriod] = useState<"month" | "quarter" | "year" | "all">("all");

  const { data, isLoading } = api.partner.performance.useQuery(
    { sortBy, period },
    { enabled: tenantReady }
  );

  if (tenantLoading || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/partners">
              <Button variant="ghost" size="sm">
                <ArrowLeftRight className="mr-1 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Rentabilidade por Parceiro</h1>
          <p className="text-muted-foreground text-sm">
            Análise de desempenho financeiro dos parceiros
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="quarter">Este trimestre</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit">Maior lucro</SelectItem>
            <SelectItem value="volume">Maior volume</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Parceiros Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{summary.totalPartners}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary.totalReceived)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalPaid)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resultado Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span
                  className={`text-2xl font-bold ${
                    summary.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.totalProfit)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Table */}
      <PartnerPerformanceTable partners={data?.partners ?? []} />

      {/* Footer summary */}
      {summary && summary.totalTransactions > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-right">
          Total de {summary.totalTransactions} transações no período
        </div>
      )}
    </div>
  );
}
