"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
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
import { BankAccountType } from "@prisma/client";

const bankAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum([BankAccountType.CHECKING, BankAccountType.SAVINGS, BankAccountType.CREDIT]),
  currency: z.string().min(1, "Currency is required"),
  initialBalance: z.coerce.number().default(0),
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

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: "",
      type: BankAccountType.CHECKING,
      currency: "BRL",
      initialBalance: 0,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        currency: account.currency,
        initialBalance: account.initialBalance,
      });
    } else {
      form.reset({
        name: "",
        type: BankAccountType.CHECKING,
        currency: "BRL",
        initialBalance: 0,
      });
    }
  }, [account, form]);

  const onSubmit = (data: BankAccountFormData) => {
    if (isEditing && account) {
      updateMutation.mutate({
        id: account.id,
        ...data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              placeholder="e.g., Main Checking Account"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value) =>
                form.setValue("type", value as BankAccountType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BankAccountType.CHECKING}>
                  Checking Account
                </SelectItem>
                <SelectItem value={BankAccountType.SAVINGS}>
                  Savings Account
                </SelectItem>
                <SelectItem value={BankAccountType.CREDIT}>
                  Credit Card
                </SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={form.watch("currency")}
              onValueChange={(value) => form.setValue("currency", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.currency && (
              <p className="text-sm text-destructive">
                {form.formState.errors.currency.message}
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Initial Balance</Label>
              <Input
                id="initialBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("initialBalance", { valueAsNumber: true })}
              />
              {form.formState.errors.initialBalance && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.initialBalance.message}
                </p>
              )}
            </div>
          )}

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
