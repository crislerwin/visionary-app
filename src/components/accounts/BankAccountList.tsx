"use client";

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
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trpc/react";
import type { BankAccountType } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { BankAccountCard } from "./BankAccountCard";
import { BankAccountForm } from "./BankAccountForm";

interface BankAccount {
  id: string;
  name: string;
  type: BankAccountType;
  currency: string;
  currentBalance: number;
  initialBalance: number;
  _count?: {
    transactions: number;
  };
}

export function BankAccountList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{
    id: string;
    name: string;
    type: BankAccountType;
    currency: string;
    initialBalance: number;
  } | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);

  const { data: accounts, isLoading, refetch } = api.bankAccount.list.useQuery();
  const deleteMutation = api.bankAccount.delete.useMutation({
    onSuccess: () => {
      setDeletingAccount(null);
      refetch();
    },
  });

  const handleEdit = (account: BankAccount) => {
    setEditingAccount({
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: account.initialBalance,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (account: BankAccount) => {
    setDeletingAccount(account);
  };

  const confirmDelete = () => {
    if (deletingAccount) {
      deleteMutation.mutate({ id: deletingAccount.id });
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Accounts</h2>
          <p className="text-muted-foreground">Manage your bank accounts and track balances</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      {accounts?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No accounts yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Get started by adding your first bank account to track your finances
          </p>
          <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account) => {
            const accountNormalized: BankAccount = {
              ...account,
              currentBalance: Number(account.currentBalance),
              initialBalance: Number(account.initialBalance),
            };
            return (
              <BankAccountCard
                key={account.id}
                account={accountNormalized}
                onEdit={() => handleEdit(accountNormalized)}
                onDelete={() => handleDelete(accountNormalized)}
              />
            );
          })}
        </div>
      )}

      <BankAccountForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        account={editingAccount}
        onSuccess={handleFormClose}
      />

      <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAccount?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
