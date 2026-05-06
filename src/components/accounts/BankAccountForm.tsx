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
import { BankAccountType } from "@prisma/client";

const bankAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum([BankAccountType.CHECKING, BankAccountType.SAVINGS, BankAccountType.CREDIT]),
  currency: z.string().min(1, "Currency is required"),
  initialBalance: z.coerce.number(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: {
    id: string;
    name: string;
    type: BankAccountType;
    currency: string;
    initialBalance: number;
  } | null;
  onSuccess?: () => void;
}

const currencies = [
  { code: "BRL", name: "Brazilian Real" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "MXN", name: "Mexican Peso" },
];

export function BankAccountForm({
  open,
  onOpenChange,
  account,
  onSuccess,
}: BankAccountFormProps) {
  const isEditing = !!account;

  const createMutation = api.bankAccount.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = api.bankAccount.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const defaultValues = useMemo(
    () => ({
      name: account?.name ?? "",
      type: account?.type ?? BankAccountType.CHECKING,
      currency: account?.currency ?? "BRL",
      initialBalance: account?.initialBalance ?? 0,
    }),
    [account]
  );

  const handleSubmit = async (data: BankAccountFormData) => {
    if (isEditing && account) {
      await updateMutation.mutateAsync({
        id: account.id,
        ...data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const fields = useMemo<SmartField<BankAccountFormData>[]>(
    () => [
      {
        name: "name",
        label: "Account Name",
        type: "text",
        placeholder: "e.g., Main Checking Account",
        required: true,
      },
      {
        name: "type",
        label: "Account Type",
        type: "select",
        required: true,
        options: [
          { label: "Checking Account", value: "CHECKING" },
          { label: "Savings Account", value: "SAVINGS" },
          { label: "Credit Card", value: "CREDIT" },
        ],
      },
      {
        name: "currency",
        label: "Currency",
        type: "select",
        required: true,
        options: currencies.map((c) => ({
          label: `${c.code} - ${c.name}`,
          value: c.code,
        })),
      },
      ...(!isEditing
        ? [
            {
              name: "initialBalance" as const,
              label: "Initial Balance",
              type: "number" as const,
              placeholder: "0.00",
            },
          ]
        : []),
    ],
    [isEditing]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Bank Account" : "New Bank Account"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the account details below."
              : "Add a new bank account to track your finances."}
          </DialogDescription>
        </DialogHeader>

        <SmartForm
          schema={bankAccountSchema}
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
