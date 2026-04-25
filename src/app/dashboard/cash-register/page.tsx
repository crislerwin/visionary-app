"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/trpc/react";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
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
import { TransactionsList } from "./_components/transactions-list";

export default function CashRegisterPage() {
  const [openOpenDialog, setOpenOpenDialog] = useState(false);
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "WITHDRAWAL">("EXPENSE");

  const { data: cashRegister, isLoading, refetch } = api.cashRegister.getCurrent.useQuery();

  const isOpen = cashRegister?.status === "OPEN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Caixa</h1>
          <p className="text-muted-foreground">Gerencie entradas, saídas e fechamento diário</p>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <Button variant="destructive" onClick={() => setOpenCloseDialog(true)}>
              <Lock className="mr-2 h-4 w-4" />
              Fechar Caixa
            </Button>
          ) : (
            <Button onClick={() => setOpenOpenDialog(true)}>
              <Unlock className="mr-2 h-4 w-4" />
              Abrir Caixa
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isOpen ? "Saldo Atual" : "Caixa Fechado"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : isOpen ? (
              <div className="text-2xl font-bold">
                {formatCurrency(cashRegister?.currentBalance || 0)}
              </div>
            ) : (
              <div className="text-muted-foreground">Abra o caixa para começar</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(cashRegister?.totalEntries || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
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
            onClick={() => {
              setTransactionType("EXPENSE");
              setOpenTransactionDialog(true);
            }}
          >
            <MinusCircle className="mr-2 h-4 w-4" />
            Registrar Despesa
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTransactionType("WITHDRAWAL");
              setOpenTransactionDialog(true);
            }}
          >
            <MinusCircle className="mr-2 h-4 w-4" />
            Sangria
          </Button>
        </div>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-12 w-full bg-muted animate-pulse rounded" />
              <div className="h-12 w-full bg-muted animate-pulse rounded" />
              <div className="h-12 w-full bg-muted animate-pulse rounded" />
            </div>
          ) : isOpen && cashRegister?.transactions ? (
            <TransactionsList transactions={cashRegister.transactions} />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {isOpen
                ? "Nenhuma movimentação registrada"
                : "Abra o caixa para ver as movimentações"}
            </div>
          )}
        </CardContent>
      </Card>

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
  );
}
