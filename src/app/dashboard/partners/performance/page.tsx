"use client";

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
import { ArrowLeft, Receipt, TrendingDown, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function PartnerPerformancePage() {
  const { t, i18n } = useTranslation("common");
  const { currentTenant, isLoading: tenantLoading } = useCurrentTenant();
  const tenantReady = !tenantLoading && !!currentTenant;

  const [sortBy, setSortBy] = useState<"profit" | "volume">("profit");
  const [period, setPeriod] = useState<"month" | "quarter" | "year" | "all">("all");

  const { data, isLoading } = api.partner.performance.useQuery(
    { sortBy, period },
    { enabled: tenantReady },
  );

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPeriodLabel = (p: string) => {
    switch (p) {
      case "all":
        return t("partnerPerformance.allTime");
      case "month":
        return t("partnerPerformance.thisMonth");
      case "quarter":
        return t("partnerPerformance.thisQuarter");
      case "year":
        return t("partnerPerformance.thisYear");
      default:
        return p;
    }
  };

  const getSortByLabel = (s: string) => {
    switch (s) {
      case "profit":
        return t("partnerPerformance.highestProfit");
      case "volume":
        return t("partnerPerformance.highestVolume");
      default:
        return s;
    }
  };

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

  const summary = data?.summary;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/partners">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("back")}
              </Button>
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t("partnerPerformance.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("partnerPerformance.description")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("partnerPerformance.period")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("partnerPerformance.allTime")}</SelectItem>
            <SelectItem value="month">{t("partnerPerformance.thisMonth")}</SelectItem>
            <SelectItem value="quarter">{t("partnerPerformance.thisQuarter")}</SelectItem>
            <SelectItem value="year">{t("partnerPerformance.thisYear")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("partnerPerformance.sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit">{t("partnerPerformance.highestProfit")}</SelectItem>
            <SelectItem value="volume">{t("partnerPerformance.highestVolume")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("partnerPerformance.activePartners")}
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
                {t("partnerPerformance.totalReceived")}
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
                {t("partnerPerformance.totalPaid")}
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
                {t("partnerPerformance.netResult")}
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
          {t("partnerPerformance.totalTransactions")}: {summary.totalTransactions}
        </div>
      )}
    </div>
  );
}
