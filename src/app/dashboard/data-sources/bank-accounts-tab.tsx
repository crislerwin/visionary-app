"use client";

import { api } from "@/lib/trpc/react";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import type { TransactionStatus, TransactionType } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";

// ── Types ──

interface BankAccount {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  currency: string;
  initialBalance: string | number;
  currentBalance: string | number;
  createdAt: string;
  _count: { transactions: number };
}

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  categoryName: string | null;
  amount: string | number;
  type: TransactionType;
  currency: string;
  status: TransactionStatus;
}

// ── Helpers ──

function currency(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const fdate = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ── Transaction Columns ──

const transactionColumns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "date",
    header: "Data",
    cell: ({ row }) => <span className="whitespace-nowrap">{fdate(row.getValue("date"))}</span>,
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>,
  },
  {
    accessorKey: "categoryName",
    header: "Categoria",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("categoryName") ?? "—"}</span>
    ),
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
            type === "INCOME"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          {type === "INCOME" ? "+" : "−"}
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
            status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : status === "PENDING"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
          )}
        >
          {status === "COMPLETED" ? "Concluído" : status === "PENDING" ? "Pendente" : "Cancelado"}
        </span>
      );
    },
  },
];

// ── Account Card (minimalista) ──

function AccountCard({
  account,
  onClick,
}: {
  account: BankAccount;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{account.name}</p>
            {account.bankName && (
              <p className="truncate text-[11px] text-muted-foreground">{account.bankName}</p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-[9px] uppercase tracking-wider">
            {account.type}
          </Badge>
        </div>
        <p className="mt-1.5 text-lg font-bold leading-tight">{currency(account.currentBalance)}</p>
        <p className="text-[11px] text-muted-foreground">
          {account._count.transactions} transações
        </p>
      </CardContent>
    </Card>
  );
}

// ── Transaction Table (DataTable) ──

function TransactionTable({ accountId, onBack }: { accountId: string; onBack: () => void }) {
  const { data: account } = api.bankAccount.byId.useQuery({ id: accountId });
  const { data: txPage, isLoading } = api.transaction.list.useQuery({
    bankAccountId: accountId,
    limit: 50,
    offset: 0,
  });

  const transactions =
    txPage?.transactions.map(
      (tx) =>
        ({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          categoryName: tx.category?.name ?? null,
          amount: tx.amount,
          type: tx.type,
          currency: tx.currency,
          status: tx.status,
        }) as TransactionRow,
    ) ?? [];

  const accountName = account?.name ?? "Conta";
  const accountBalance = account?.currentBalance ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{accountName}</h2>
          <p className="text-xs text-muted-foreground">
            {currency(accountBalance)} · {transactions.length} transações
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando transações...
        </div>
      ) : transactions.length > 0 ? (
        <DataTable
          columns={transactionColumns}
          data={transactions}
          searchKey="description"
          searchPlaceholder="Buscar transação..."
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma transação nesta conta.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Component ──

export function BankAccountsTab() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { data: accounts, isLoading, error } = api.bankAccount.list.useQuery();

  if (selectedAccountId) {
    return (
      <TransactionTable accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Contas Importadas
          </CardTitle>
          <CardDescription>Clique em uma conta para ver suas transações.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando contas...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Erro ao carregar contas</p>
              <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
            </div>
          ) : !accounts?.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma conta importada ainda.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => (
                <AccountCard
                  key={acc.id}
                  account={acc as unknown as BankAccount}
                  onClick={() => setSelectedAccountId(acc.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
