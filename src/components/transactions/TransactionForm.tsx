"use client";

import { Loader2 } from "lucide-react";
import { useMemo } from "react";
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
import { SmartForm, type SmartField } from "@/components/ui/smart-form";
import { api } from "@/lib/trpc/react";
import { TransactionStatus, TransactionType } from "@prisma/client";

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
      categoryId: transaction?.categoryId ?? undefined,
      status: transaction?.status ?? TransactionStatus.COMPLETED,
    }),
    [transaction]
  );

  const handleSubmit = async (data: TransactionFormData) => {
    if (isEditing && transaction) {
      await updateMutation.mutateAsync({
        id: transaction.id,
        ...data,
        date: data.date,
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        date: data.date,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const bankAccountOptions = useMemo(
    () =>
      bankAccounts?.map((account) => ({
        label: `${account.name} (${account.currency})`,
        value: account.id,
      })) ?? [],
    [bankAccounts]
  );

  const categoryOptions = useMemo(
    () => [
      { label: "No category", value: "" },
      ...(categoriesData?.categories?.map((category) => ({
        label: category.name,
        value: category.id,
      })) ?? []),
    ],
    [categoriesData]
  );

  const fields: SmartField<TransactionFormData>[] = [
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Income", value: TransactionType.INCOME },
        { label: "Expense", value: TransactionType.EXPENSE },
      ],
    },
    {
      name: "amount",
      label: "Amount",
      type: "number",
      placeholder: "0.00",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "text",
      placeholder: "Enter description...",
      required: true,
    },
    {
      name: "date",
      label: "Date",
      type: "date",
      required: true,
    },
    {
      name: "bankAccountId",
      label: "Bank Account",
      type: "select",
      required: true,
      options: bankAccountOptions,
    },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      placeholder: "Select category (optional)",
      options: categoryOptions,
      transform: {
        output: (value) => (value === "" ? undefined : value),
      },
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { label: "Completed", value: TransactionStatus.COMPLETED },
        { label: "Pending", value: TransactionStatus.PENDING },
        { label: "Cancelled", value: TransactionStatus.CANCELLED },
      ],
    },
  ];

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

        <SmartForm
          schema={transactionSchema}
          fields={fields}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          footer={
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
          }
        />
      </DialogContent>
    </Dialog>
  );
}
