"use client";

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
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

interface RegisterTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "EXPENSE" | "WITHDRAWAL";
  currentBalance: number;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: "suprimentos", label: "Suprimentos" },
  { value: "manutencao", label: "Manutenção" },
  { value: "despesas_gerais", label: "Despesas Gerais" },
  { value: "outros", label: "Outros" },
];

export function RegisterTransactionDialog({
  open,
  onOpenChange,
  type,
  currentBalance,
  onSuccess,
}: RegisterTransactionDialogProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const transactionMutation = api.cashRegister.addTransaction.useMutation({
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      setAmount("");
      setDescription("");
      setCategory("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number.parseFloat(amount.replace(",", ".")) || 0;
    transactionMutation.mutate({
      type,
      amount: amountNum,
      description,
      category: category || undefined,
    });
  };

  const title = type === "EXPENSE" ? "Registrar Despesa" : "Registrar Sangria";
  const amountLabel = type === "EXPENSE" ? "Valor da Despesa (R$)" : "Valor da Sangria (R$)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {type === "EXPENSE"
              ? "Registre uma despesa ou saída de caixa"
              : "Registre uma retirada de valores do caixa"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span>Saldo atual:</span>
                <span className="font-medium">{formatCurrency(currentBalance)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{amountLabel}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Descreva a movimentação"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {type === "EXPENSE" && (
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={transactionMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={transactionMutation.isPending || !amount || !description}
            >
              {transactionMutation.isPending ? "Registrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
