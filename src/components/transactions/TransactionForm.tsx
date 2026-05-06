"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/trpc/react";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { useMemo } from "react";

const transactionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  description: z.string().min(1, "Description is required").max(500),
  date: z.coerce.date(),
  bankAccountId: z.string().min(1, "Bank account is required"),
  categoryId: z.string().optional(),
  status: z.enum([
    TransactionStatus.COMPLETED,
    TransactionStatus.PENDING,
    TransactionStatus.CANCELLED,
  ]),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: {
    id: string;
    amount: number;
    type: TransactionType;
    description: string;
    date: Date;
    bankAccountId: string;
    categoryId: string | null;
    status: TransactionStatus;
  } | null;
  onSuccess?: () => void;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: TransactionFormProps) {
  const isEditing = !!transaction;

  const { data: bankAccounts } = api.bankAccount.list.useQuery(undefined);
  const { data: categoriesData } = api.category.list.useQuery({});

  const createMutation = api.transaction.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = api.transaction.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const defaultValues = useMemo(
    () => ({
      amount: transaction?.amount ?? 0,
      type: transaction?.type ?? TransactionType.EXPENSE,
      description: transaction?.description ?? "",
      date: transaction?.date ? new Date(transaction.date) : new Date(),
      bankAccountId: transaction?.bankAccountId ?? "",
      categoryId: transaction?.categoryId ?? "",
      status: transaction?.status ?? TransactionStatus.COMPLETED,
    }),
    [transaction]
  );

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const submitData = {
      ...data,
      categoryId: data.categoryId || undefined,
    };
    
    if (isEditing && transaction) {
      await updateMutation.mutateAsync({
        id: transaction.id,
        ...submitData,
        date: data.date.toISOString(),
      });
    } else {
      await createMutation.mutateAsync({
        ...submitData,
        date: data.date.toISOString(),
      });
    }
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the transaction details below."
              : "Add a new transaction to track your finances."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value) =>
                form.setValue("type", value as TransactionType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Enter description..."
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...form.register("date", {
                setValueAs: (v) => (v ? new Date(v) : new Date()),
              })}
            />
            {form.formState.errors.date && (
              <p className="text-sm text-destructive">
                {form.formState.errors.date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccountId">Bank Account</Label>
            <Select
              value={form.watch("bankAccountId")}
              onValueChange={(value) => form.setValue("bankAccountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.bankAccountId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.bankAccountId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select
              value={form.watch("categoryId") || "none"}
              onValueChange={(value) =>
                form.setValue("categoryId", value === "none" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categoriesData?.categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) =>
                form.setValue("status", value as TransactionStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionStatus.COMPLETED}>
                  Completed
                </SelectItem>
                <SelectItem value={TransactionStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={TransactionStatus.CANCELLED}>
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-sm text-destructive">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
