"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
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

const transactionSchema = z.object({
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  description: z.string().min(1, "Descrição obrigatória").max(500),
  date: z.string().min(1, "Data obrigatória"),
  bankAccountId: z.string().min(1, "Conta bancária obrigatória"),
  categoryId: z.string().optional(),
  partnerId: z.string().optional(),
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
    partnerId: string | null;
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
  const [splitPreview, setSplitPreview] = useState<{
    amount: number;
    type: string;
    value: number;
  } | null>(null);

  const { data: bankAccounts } = api.bankAccount.list.useQuery(undefined);
  const { data: categoriesData } = api.category.list.useQuery({});
  const { data: partners } = api.partner.list.useQuery(undefined, {
    enabled: !isEditing, // Só busca parceiros na criação (não edição)
  });

  const createMutation = api.transaction.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
      setSplitPreview(null);
    },
  });

  const updateMutation = api.transaction.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const defaultValues = useMemo<DefaultValues<TransactionFormData>>(
    () => ({
      amount: transaction?.amount ?? 0,
      type: transaction?.type ?? TransactionType.EXPENSE,
      description: transaction?.description ?? "",
      date: transaction?.date
        ? new Date(transaction.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      bankAccountId: transaction?.bankAccountId ?? "",
      categoryId: transaction?.categoryId ?? "",
      partnerId: transaction?.partnerId ?? "",
      status: transaction?.status ?? TransactionStatus.COMPLETED,
    }),
    [transaction],
  );

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  const watchedType = form.watch("type");
  const watchedPartnerId = form.watch("partnerId");
  const watchedAmount = form.watch("amount");

  // Calculate split preview
  useMemo(() => {
    if (watchedType !== TransactionType.INCOME || !watchedPartnerId || !partners) {
      setSplitPreview(null);
      return;
    }
    const partner = partners.find((p) => p.id === watchedPartnerId);
    if (!partner || partner.commissionValue <= 0) {
      setSplitPreview(null);
      return;
    }

    let amount = 0;
    if (partner.commissionType === "PERCENTAGE") {
      amount = watchedAmount * (partner.commissionValue / 100);
    } else if (partner.commissionType === "FIXED") {
      amount = Math.min(partner.commissionValue, watchedAmount);
    }

    if (amount > 0) {
      setSplitPreview({
        amount,
        type: partner.commissionType,
        value: partner.commissionValue,
      });
    } else {
      setSplitPreview(null);
    }
  }, [watchedType, watchedPartnerId, watchedAmount, partners]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const submitData = {
      ...data,
      date: new Date(data.date),
      categoryId: data.categoryId || undefined,
      partnerId: data.partnerId || undefined,
    };

    if (isEditing && transaction) {
      await updateMutation.mutateAsync({
        id: transaction.id,
        ...submitData,
      });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os detalhes da transação."
              : "Adicione uma nova transação para acompanhar suas finanças."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value) => {
                form.setValue("type", value as TransactionType);
                if (value !== TransactionType.INCOME) {
                  form.setValue("partnerId", "");
                  setSplitPreview(null);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionType.INCOME}>Entrada</SelectItem>
                <SelectItem value={TransactionType.EXPENSE}>Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              {...form.register("amount", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Descreva a transação..."
              {...form.register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" {...form.register("date")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccountId">Conta Bancária</Label>
            <Select
              value={form.watch("bankAccountId")}
              onValueChange={(value) => form.setValue("bankAccountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              value={form.watch("categoryId") || "none"}
              onValueChange={(value) => form.setValue("categoryId", value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categoriesData?.categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* US06: Partner split section — only on new INCOME transactions */}
          {!isEditing && watchedType === TransactionType.INCOME && (
            <>
              <div className="space-y-2">
                <Label htmlFor="partnerId">Parceiro (Divisão de Receita)</Label>
                <Select
                  value={form.watch("partnerId") || "none"}
                  onValueChange={(value) =>
                    form.setValue("partnerId", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um parceiro (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem parceiro</SelectItem>
                    {partners?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{" "}
                        {p.commissionValue > 0 && (
                          <span className="text-muted-foreground text-xs">
                            —{" "}
                            {p.commissionType === "PERCENTAGE"
                              ? `${p.commissionValue}%`
                              : `R$ ${p.commissionValue.toFixed(2)}`}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Split Preview */}
              {splitPreview && (
                <div className="rounded-md border bg-amber-50 p-3 dark:bg-amber-950/20">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    💰 Divisão automática configurada
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Será gerada uma "Conta a Pagar" de{" "}
                    <strong>R$ {splitPreview.amount.toFixed(2)}</strong>
                    {splitPreview.type === "PERCENTAGE"
                      ? ` (${splitPreview.value}% do valor)`
                      : ` (valor fixo de R$ ${splitPreview.value.toFixed(2)})`}
                    . Vencimento em 30 dias.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value as TransactionStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionStatus.COMPLETED}>Concluída</SelectItem>
                <SelectItem value={TransactionStatus.PENDING}>Pendente</SelectItem>
                <SelectItem value={TransactionStatus.CANCELLED}>Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
