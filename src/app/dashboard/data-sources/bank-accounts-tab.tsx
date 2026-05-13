"use client";

import { api } from "@/lib/trpc/react";
import { BankAccountType } from "@prisma/client";
import { Building2, Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// ── Helpers ──

const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TYPE_OPTIONS = [
  { value: "CHECKING", label: "Conta Corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "CREDIT", label: "Cartão de Crédito" },
  { value: "INVESTMENT", label: "Investimentos" },
  { value: "DIGITAL_WALLET", label: "Carteira Digital" },
  { value: "OTHER", label: "Outro" },
];

// ── Types ──

interface Account {
  id: string;
  name: string;
  bankName: string | null;
  type: string;
  currentBalance: string;
}

interface Txn {
  id: string;
  date: string | Date;
  description: string | null;
  category: string | null;
  amount: number;
  type: string;
}

// ── Main ──

export function BankAccountsTab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; bank: string; type: BankAccountType }>({
    name: "",
    bank: "",
    type: BankAccountType.CHECKING,
  });

  const utils = api.useUtils();

  const { data: rawAccounts, isLoading: accountsLoading } = api.bankAccount.list.useQuery();
  const accounts: Account[] =
    rawAccounts?.map((a) => ({
      id: a.id,
      name: a.name,
      bankName: a.bankName,
      type: a.type,
      currentBalance: a.currentBalance ?? "0",
    })) ?? [];

  // Auto-select first account
  if (!activeId && accounts.length > 0) {
    setActiveId(accounts[0].id);
  }

  const active = accounts.find((a) => a.id === activeId) ?? null;
  const toDelete = accounts.find((a) => a.id === confirmDeleteId) ?? null;
  const editOpen = isCreating || editingId !== null;

  // ── Mutations ──

  const createAccount = api.bankAccount.create.useMutation({
    onSuccess: (data) => {
      utils.bankAccount.list.invalidate();
      setActiveId(data.id);
      closeEdit();
    },
  });

  const updateAccount = api.bankAccount.update.useMutation({
    onSuccess: () => {
      utils.bankAccount.list.invalidate();
      utils.transaction.list.invalidate();
      closeEdit();
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

  // ── Actions ──

  const openEdit = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    setForm({ name: acc.name, bank: acc.bankName ?? "", type: acc.type as BankAccountType });
    setEditingId(id);
    setIsCreating(false);
  };

  const openCreate = () => {
    setForm({ name: "", bank: "", type: BankAccountType.CHECKING });
    setEditingId(null);
    setIsCreating(true);
  };

  const closeEdit = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const saveAccount = () => {
    if (!form.name.trim() || !form.bank.trim()) return;
    if (isCreating) {
      createAccount.mutate({
        name: form.name.trim(),
        bankName: form.bank.trim(),
        type: form.type,
        currency: "BRL",
        initialBalance: 0,
      });
    } else if (editingId) {
      updateAccount.mutate({
        id: editingId,
        name: form.name.trim(),
        bankName: form.bank.trim(),
        type: form.type,
        currency: "BRL",
      });
    }
  };

  // ── Render ──

  return (
    <Card className="overflow-hidden">
      {/* Tabs */}
      <div className="flex items-end gap-1 overflow-x-auto border-b bg-muted/30 px-2 pt-2">
        <button
          type="button"
          onClick={openCreate}
          aria-label="Adicionar conta"
          title="Adicionar conta"
          className="mb-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-t-lg border border-b-0 border-transparent bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>

        {accountsLoading ? (
          <div className="flex items-center gap-2 px-3 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando contas...</span>
          </div>
        ) : accounts.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">
            Nenhuma conta. Clique em + para adicionar.
          </p>
        ) : (
          accounts.map((acc) => {
            const isActive = acc.id === activeId;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: tabs mouse-first
              <div
                key={acc.id}
                onClick={() => setActiveId(acc.id)}
                className={`group flex min-w-[180px] max-w-[240px] cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-border bg-background text-foreground shadow-sm"
                    : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
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
                    <DropdownMenuItem onSelect={() => openEdit(acc.id)}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setConfirmDeleteId(acc.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Create Modal */}
      <Dialog open={editOpen} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? "Adicionar conta" : "Editar conta"}</DialogTitle>
            <DialogDescription>Configure os dados da conta bancária ou cartão.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="acc-name">Nome da conta</Label>
              <Input
                id="acc-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                  }))
                }
                placeholder="Ex: Itaú Principal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acc-bank">Banco / Instituição</Label>
              <Input
                id="acc-bank"
                value={form.bank}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    bank: e.target.value,
                  }))
                }
                placeholder="Ex: Itaú"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acc-type">Tipo de conta</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as BankAccountType }))}
              >
                <SelectTrigger id="acc-type">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancelar
            </Button>
            <Button
              onClick={saveAccount}
              disabled={
                !form.name.trim() ||
                !form.bank.trim() ||
                createAccount.isPending ||
                updateAccount.isPending
              }
            >
              {createAccount.isPending || updateAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta{" "}
              <span className="font-medium text-foreground">{toDelete?.name}</span>? Esta ação não
              pode ser desfeita e todas as transações vinculadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deleteAccount.mutate({ id: confirmDeleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                {TYPE_OPTIONS.find((t) => t.value === active.type)?.label ?? active.type}
              </CardDescription>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo atual</p>
              <p
                className={`text-2xl font-semibold ${
                  Number(active.currentBalance) < 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {currency(Number(active.currentBalance))}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <AccountTransactionsTable accountId={activeId} />
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

// ── Isolated Transactions Table (prevents full card re-render on pagination) ──

import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";

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
          className={`font-medium ${
            type === "INCOME"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {type === "INCOME" ? "+" : "−"}
          {currency(Math.abs(amount))}
        </span>
      );
    },
  },
];

function AccountTransactionsTable({ accountId }: { accountId: string | null }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const {
    data: txPage,
    error: txError,
    isLoading: txLoading,
  } = api.transaction.list.useQuery(
    accountId
      ? {
          bankAccountId: accountId,
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
        }
      : {},
    { enabled: !!accountId },
  );

  const transactions: Txn[] = useMemo(() => {
    return (
      txPage?.transactions?.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category?.name ?? null,
        amount: Number(t.amount),
        type: t.type,
      })) ?? []
    );
  }, [txPage]);

  const txTotal = txPage?.total ?? 0;
  const txPageCount = Math.ceil(txTotal / pagination.pageSize) || 1;

  return (
    <>
      {txError && (
        <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {txError.message}
        </div>
      )}

      {txLoading ? (
        <div className="space-y-2 rounded-md border p-2">
          {Array.from({ length: pagination.pageSize }).map((_, i) => (
            <Skeleton key={String(i)} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={transactionColumns}
          data={transactions}
          searchKey="description"
          searchPlaceholder="Filtrar transações..."
          manualPagination
          pageCount={txPageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRows={txTotal}
        />
      )}
    </>
  );
}
