"use client";

import { api } from "@/lib/trpc/react";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Helpers ──

const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Types ──

interface Account {
  id: string;
  name: string;
  bankName: string | null;
  type: string;
  currentBalance: string;
  _count: { transactions: number };
}

interface Txn {
  id: string;
  date: string | Date;
  description: string;
  category: string | null;
  amount: number;
  type: string;
}

// ── Main ──

export function BankAccountsTab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data: rawAccounts, isLoading: accountsLoading } = api.bankAccount.list.useQuery();
  const accounts: Account[] =
    rawAccounts?.map((a) => ({
      id: a.id,
      name: a.name,
      bankName: a.bankName,
      type: a.type,
      currentBalance: a.currentBalance ?? a.initialBalance ?? "0",
      _count: a._count,
    })) ?? [];

  // Auto-select first account
  if (!activeId && accounts.length > 0) {
    setActiveId(accounts[0].id);
  }

  const active = accounts.find((a) => a.id === activeId) ?? null;

  const {
    data: txPage,
    isLoading: txLoading,
    error: txError,
  } = api.transaction.list.useQuery(
    activeId
      ? {
          bankAccountId: activeId,
          page,
          pageSize,
          search: search.trim() || undefined,
        }
      : undefined,
    { enabled: !!activeId },
  );

  const transactions: Txn[] =
    txPage?.transactions?.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category?.name ?? null,
      amount: Number(t.amount),
      type: t.type,
    })) ?? [];

  const totalPages = txPage?.total ? Math.ceil(txPage.total / pageSize) : 1;
  const totalCount = txPage?.total ?? 0;

  const deleteAccount = api.bankAccount.delete.useMutation({
    onSuccess: () => {
      if (activeId === confirmDeleteId) {
        const next = accounts.filter((a) => a.id !== confirmDeleteId);
        setActiveId(next[0]?.id ?? null);
      }
      setConfirmDeleteId(null);
    },
    onError: () => setConfirmDeleteId(null),
  });

  // Refresh mutation
  const _refreshAccount = api.bankAccount.refreshBalance.useMutation();

  // ── Render ──

  return (
    <Card className="overflow-hidden">
      {/* Account tabs */}
      <div className="flex items-end gap-1 overflow-x-auto border-b bg-muted/30 px-2 pt-2">
        {accountsLoading ? (
          <div className="flex items-center gap-2 px-3 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando contas...</span>
          </div>
        ) : accounts.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">Nenhuma conta disponível.</p>
        ) : (
          accounts.map((acc) => {
            const isActive = acc.id === activeId;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: tabs are mouse-first, keyboard nav via native buttons inside
              <div
                key={acc.id}
                onClick={() => {
                  setActiveId(acc.id);
                  setPage(1);
                  setSearch("");
                }}
                className={cn(
                  "group flex min-w-[180px] max-w-[240px] cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-border bg-background text-foreground shadow-sm"
                    : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-medium">{acc.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label={`Ações para ${acc.name}`}
                      className="ml-auto rounded p-0.5 opacity-60 transition-opacity hover:bg-accent hover:opacity-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => setActiveId(acc.id)}>
                      <Wallet className="mr-2 h-4 w-4" />
                      Visualizar transações
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" />
                      Renomear conta
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setConfirmDeleteId(acc.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir conta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation (inline, no AlertDialog — uses simple state) */}
      {confirmDeleteId && (
        <div className="border-b bg-destructive/5 p-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="text-sm">
              Excluir conta{" "}
              <span className="font-medium">
                {accounts.find((a) => a.id === confirmDeleteId)?.name}
              </span>
              ? Todas as transações serão removidas.
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={() => deleteAccount.mutate({ id: confirmDeleteId })}
                disabled={deleteAccount.isPending}
              >
                {deleteAccount.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active account content */}
      {active ? (
        <>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                {active.name}
              </CardTitle>
              <CardDescription>
                {active.bankName ?? "Banco desconhecido"} · {active.type}
              </CardDescription>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo atual</p>
              <p
                className={cn(
                  "text-2xl font-semibold",
                  Number(active.currentBalance) < 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {currency(Number(active.currentBalance))}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar transações..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 text-xs"
              />
            </div>

            {/* Error */}
            {txError && (
              <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                {txError.message}
              </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Nenhuma transação para esta conta.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">
                          {new Date(t.date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm">{t.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t.category ?? "—"}</Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            t.type === "INCOME" ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {t.type === "INCOME" ? "+" : "−"}
                          {currency(Math.abs(t.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} — {totalCount} registros
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      ) : (
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Selecione ou adicione uma conta para visualizar suas transações.
        </CardContent>
      )}
    </Card>
  );
}
