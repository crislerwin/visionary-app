"use client";

import { api } from "@/lib/trpc/react";
import {
  AlertTriangle,
  Building2,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BankAccountType } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";

// ── Helpers ──

const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TYPE_LABELS: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CREDIT: "Cartão de crédito",
  INVESTMENT: "Investimento",
  DIGITAL_WALLET: "Carteira digital",
  OTHER: "Outro",
};

const BANK_OPTIONS = [
  "Itaú",
  "Nubank",
  "Bradesco",
  "Banco do Brasil",
  "Santander",
  "BTG Pactual",
  "Inter",
  "C6 Bank",
  "PicPay",
  "Mercado Pago",
  "Outro",
];

// ── Types ──

interface Account {
  id: string;
  name: string;
  bankName: string | null;
  type: string;
  currency: string;
  currentBalance: string;
  _count: { transactions: number };
}

interface Txn {
  id: string;
  date: string | Date;
  description: string | null;
  category: string | null;
  amount: number;
  type: string;
}

// ── Account Form Modal ──

interface AccountFormData {
  name: string;
  bankName: string;
  type: BankAccountType;
  currency: string;
  initialBalance: string;
}

function AccountModal({
  open,
  onOpenChange,
  account,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: Account | null;
  onSubmit: (data: AccountFormData) => void;
  isSubmitting: boolean;
}) {
  const isEdit = !!account;
  const [form, setForm] = useState<AccountFormData>({
    name: "",
    bankName: "",
    type: "CHECKING",
    currency: "BRL",
    initialBalance: "0",
  });

  useEffect(() => {
    setForm({
      name: account?.name ?? "",
      bankName: account?.bankName ?? "",
      type: (account?.type as BankAccountType) ?? "CHECKING",
      currency: account?.currency ?? "BRL",
      initialBalance: account ? String(Number(account.currentBalance)) : "0",
    });
  }, [account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.bankName.trim()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os dados da conta bancária."
              : "Preencha os dados para criar uma nova conta."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium">Nome da conta</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Principal"
              className="h-7 text-xs"
              required
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium">Instituição</Label>
            <Select
              value={form.bankName}
              onValueChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {BANK_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as BankAccountType }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium">Moeda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!isEdit && (
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium">Saldo inicial</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.initialBalance}
                onChange={(e) => setForm((f) => ({ ...f, initialBalance: e.target.value }))}
                placeholder="0,00"
                className="h-7 text-xs"
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !form.name.trim() || !form.bankName.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isEdit ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ──

export function BankAccountsTab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const utils = api.useUtils();

  const { data: rawAccounts, isLoading: accountsLoading } = api.bankAccount.list.useQuery();
  const accounts: Account[] =
    rawAccounts?.map((a) => ({
      id: a.id,
      name: a.name,
      bankName: a.bankName,
      type: a.type,
      currency: a.currency,
      currentBalance: a.currentBalance ?? a.initialBalance ?? "0",
      _count: a._count,
    })) ?? [];

  // Auto-select first account
  if (!activeId && accounts.length > 0) {
    setActiveId(accounts[0].id);
  }

  const active = accounts.find((a) => a.id === activeId) ?? null;

  const { data: txPage, error: txError } = api.transaction.list.useQuery(
    activeId ? { bankAccountId: activeId, page: 1, pageSize: 1000 } : {},
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

  // ── Mutations ──

  const createAccount = api.bankAccount.create.useMutation({
    onSuccess: (data) => {
      utils.bankAccount.list.invalidate();
      setModalOpen(false);
      setActiveId(data.id);
    },
  });

  const updateAccount = api.bankAccount.update.useMutation({
    onSuccess: () => {
      utils.bankAccount.list.invalidate();
      utils.transaction.list.invalidate();
      setModalOpen(false);
      setEditingAccount(null);
    },
  });

  const deleteAccount = api.bankAccount.delete.useMutation({
    onSuccess: () => {
      if (activeId === confirmDeleteId) {
        const next = accounts.filter((a) => a.id !== confirmDeleteId);
        setActiveId(next[0]?.id ?? null);
      }
      setConfirmDeleteId(null);
      utils.bankAccount.list.invalidate();
      utils.transaction.list.invalidate();
    },
    onError: () => setConfirmDeleteId(null),
  });

  const handleCreate = (form: AccountFormData) => {
    createAccount.mutate({
      name: form.name.trim(),
      bankName: form.bankName.trim(),
      type: form.type,
      currency: form.currency,
      initialBalance: Number(form.initialBalance) || 0,
    });
  };

  const handleUpdate = (form: AccountFormData) => {
    if (!editingAccount) return;
    updateAccount.mutate({
      id: editingAccount.id,
      name: form.name.trim(),
      bankName: form.bankName.trim(),
      type: form.type,
      currency: form.currency,
    });
  };

  // ── Transaction columns for DataTable ──

  const transactionColumns: ColumnDef<Txn>[] = [
    {
      accessorKey: "date",
      header: "Data",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-xs">
          {new Date(row.getValue("date") as string).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.getValue("description") as string}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => (
        <Badge variant="secondary">{(row.getValue("category") as string) ?? "—"}</Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => {
        const amount = Number(row.getValue("amount"));
        const type = (row.original as Txn).type;
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
            {currency(Math.abs(amount))}
          </span>
        );
      },
    },
  ];

  // ── Render ──

  return (
    <Card className="overflow-hidden">
      {/* Account tabs + scroll */}
      <div className="flex items-end gap-1 border-b bg-muted/30 px-2 pt-2">
        {/* Add button (fixed, outside scroll) */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-0 h-7 gap-1 rounded-t-lg px-2 text-xs"
          onClick={() => {
            setEditingAccount(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova
        </Button>

        {/* Scrollable tabs */}
        <div className="flex flex-1 items-end gap-1 overflow-x-auto">
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
                // biome-ignore lint/a11y/useKeyWithClickEvents: tabs are mouse-first
                <div
                  key={acc.id}
                  onClick={() => setActiveId(acc.id)}
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
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditingAccount(acc);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar conta
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
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="border-b bg-destructive/5 p-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="text-sm">
              Excluir conta{" "}
              <span className="font-medium">
                {accounts.find((a) => a.id === confirmDeleteId)?.name}
              </span>
              ? Todas as transações vinculadas serão removidas.
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

      {/* Account Modal (create/edit) */}
      <AccountModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditingAccount(null);
        }}
        account={editingAccount}
        onSubmit={editingAccount ? handleUpdate : handleCreate}
        isSubmitting={createAccount.isPending || updateAccount.isPending}
      />

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
                {active.bankName ?? "Banco desconhecido"} ·{" "}
                {TYPE_LABELS[active.type] ?? active.type}
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
            {txError && (
              <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                {txError.message}
              </div>
            )}

            <DataTable
              columns={transactionColumns}
              data={transactions}
              searchKey="description"
              searchPlaceholder="Filtrar transações..."
            />
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
