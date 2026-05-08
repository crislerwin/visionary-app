"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/trpc/react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  DollarSign,
  History,
  Lock,
  MinusCircle,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { CloseCashRegisterDialog } from "./_components/close-cash-register-dialog";
import { OpenCashRegisterDialog } from "./_components/open-cash-register-dialog";
import { RegisterTransactionDialog } from "./_components/register-transaction-dialog";
import { type Transaction, TransactionsList } from "./_components/transactions-list";

interface CashRegisterHistory {
  id: string;
  openedAt: Date;
  closedAt: Date | null;
  openedBy: string;
  closedBy: string | null;
  initialAmount: number;
  finalAmount: number | null;
  difference: number | null;
  totalEntries: number;
  totalExits: number;
  expectedAmount: number;
  notes: string | null;
}

const historyColumns: ColumnDef<CashRegisterHistory>[] = [
  {
    accessorKey: "openedAt",
    header: "Abertura",
    cell: ({ row }) => formatDateTime(row.original.openedAt as unknown as string),
  },
  {
    accessorKey: "closedAt",
    header: "Fechamento",
    cell: ({ row }) => formatDateTime(row.original.closedAt as unknown as string),
  },
  {
    accessorKey: "initialAmount",
    header: "Valor Inicial",
    cell: ({ row }) => formatCurrency(row.original.initialAmount),
  },
  {
    accessorKey: "totalEntries",
    header: "Entradas",
    cell: ({ row }) => (
      <span className="text-green-600">{formatCurrency(row.original.totalEntries)}</span>
    ),
  },
  {
    accessorKey: "totalExits",
    header: "Saídas",
    cell: ({ row }) => (
      <span className="text-red-600">{formatCurrency(row.original.totalExits)}</span>
    ),
  },
  {
    accessorKey: "expectedAmount",
    header: "Esperado",
    cell: ({ row }) => formatCurrency(row.original.expectedAmount),
  },
  {
    accessorKey: "finalAmount",
    header: "Contado",
    cell: ({ row }) => formatCurrency(row.original.finalAmount || 0),
  },
  {
    accessorKey: "difference",
    header: "Diferença",
    cell: ({ row }) => {
      const diff = row.original.difference || 0;
      return (
        <Badge variant={diff === 0 ? "default" : diff > 0 ? "secondary" : "destructive"}>
          {diff > 0 ? "+" : ""}
          {formatCurrency(diff)}
        </Badge>
      );
    },
  },
];

export default function CashRegisterPage() {
  const [openOpenDialog, setOpenOpenDialog] = useState(false);
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "WITHDRAWAL">("EXPENSE");

  // History pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: cashRegister, isLoading, refetch } = api.cashRegister.getCurrent.useQuery();
  const { data: historyData, isLoading: isHistoryLoading } = api.cashRegister.getHistory.useQuery({
    limit: pageSize,
    page,
    sortBy: (sorting[0]?.id as "openedAt" | "closedAt" | "difference") || "closedAt",
    sortOrder: sorting[0]?.desc ? "desc" : "asc",
  });

  const isOpen = cashRegister?.status === "OPEN";

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Controle de Caixa"
          description="Entradas, saídas e fechamento"
          action={
            isOpen ? (
              <Button size="sm" onClick={() => setOpenCloseDialog(true)}>
                <Lock className="mr-1.5 h-4 w-4" />
                Fechar Caixa
              </Button>
            ) : (
              <Button size="sm" onClick={() => setOpenOpenDialog(true)}>
                <Unlock className="mr-1.5 h-4 w-4" />
                Abrir Caixa
              </Button>
            )
          }
        />

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {isOpen ? "Saldo Atual" : "Caixa Fechado"}
              </CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-28 bg-muted animate-pulse rounded" />
              ) : isOpen ? (
                <div className="text-xl font-bold">
                  {formatCurrency(cashRegister?.currentBalance || 0)}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Abra o caixa para começar</div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Entradas
              </CardTitle>
              <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-28 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(cashRegister?.totalEntries || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Saídas
              </CardTitle>
              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-28 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(cashRegister?.totalExits || 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {isOpen && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTransactionType("EXPENSE");
                setOpenTransactionDialog(true);
              }}
            >
              <MinusCircle className="mr-1.5 h-4 w-4" />
              Despesa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTransactionType("WITHDRAWAL");
                setOpenTransactionDialog(true);
              }}
            >
              <MinusCircle className="mr-1.5 h-4 w-4" />
              Sangria
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">
              <DollarSign className="mr-2 h-4 w-4" />
              Caixa Atual
            </TabsTrigger>
            <TabsTrigger value="history">
              <Calendar className="mr-2 h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <Card className="gap-0 p-0 overflow-hidden">
              <CardHeader className="px-3 pt-3 pb-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  Movimentações
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-2">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                ) : isOpen && cashRegister?.transactions ? (
                  <TransactionsList
                    transactions={cashRegister.transactions as unknown as Transaction[]}
                  />
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8 px-3">
                    {isOpen
                      ? "Nenhuma movimentação registrada"
                      : "Abra o caixa para ver as movimentações"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="gap-0 p-0 overflow-hidden">
              <CardHeader className="px-3 pt-3 pb-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Histórico de Caixas Fechados
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-2">
                <DataTable
                  columns={historyColumns}
                  data={((historyData?.items as unknown[]) || []) as CashRegisterHistory[]}
                  totalItems={historyData?.total || 0}
                  currentPage={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  onSortingChange={setSorting}
                  isLoading={isHistoryLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <OpenCashRegisterDialog
          open={openOpenDialog}
          onOpenChange={setOpenOpenDialog}
          onSuccess={refetch}
        />

        {cashRegister && (
          <CloseCashRegisterDialog
            open={openCloseDialog}
            onOpenChange={setOpenCloseDialog}
            cashRegister={cashRegister}
            onSuccess={refetch}
          />
        )}

        {cashRegister && (
          <RegisterTransactionDialog
            open={openTransactionDialog}
            onOpenChange={setOpenTransactionDialog}
            type={transactionType}
            currentBalance={cashRegister.currentBalance || 0}
            onSuccess={refetch}
          />
        )}
      </div>
    </PageContainer>
  );
}
