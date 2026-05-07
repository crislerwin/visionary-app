"use client";

import { api } from "@/lib/trpc/react";
import { ArrowLeft, Landmark, Loader2, Wallet } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──

interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  bankName: string | null;
  accountNumber: string | null;
  createdAt: Date;
}

// ── Helpers ──

const fmoney = (n: number | string | null | undefined, currency = "BRL") =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency });

const fdate = (d: Date | string) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ── Account Card ──

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
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{account.name}</p>
              {account.bankName && (
                <p className="text-xs text-muted-foreground">{account.bankName}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {account.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{fmoney(account.balance, account.currency)}</p>
        <p className="text-xs text-muted-foreground">
          {account.accountNumber ?? "Sem número de conta"}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Transaction Table ──

function TransactionTable({ accountId, onBack }: { accountId: string; onBack: () => void }) {
  const { data: account } = api.bankAccount.byId.useQuery({ id: accountId });
  const { data: txPage, isLoading } = api.transaction.list.useQuery({
    bankAccountId: accountId,
    limit: 50,
    offset: 0,
  });

  const transactions = txPage?.transactions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{account?.name ?? "Conta"}</h2>
          <p className="text-xs text-muted-foreground">
            {account && fmoney(account.balance, account.currency)} · {transactions.length}{" "}
            transações
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-right text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma transação nesta conta.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fdate(tx.date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {tx.description}
                      </TableCell>
                      <TableCell className="text-xs">{tx.category?.name ?? "—"}</TableCell>
                      <TableCell
                        className={`text-right text-xs font-medium ${
                          tx.type === "INCOME" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "−"}
                        {fmoney(tx.amount, tx.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "COMPLETED"
                              ? "default"
                              : tx.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
                  account={acc as BankAccount}
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
