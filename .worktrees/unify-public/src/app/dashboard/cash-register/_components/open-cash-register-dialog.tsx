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
import { api } from "@/lib/trpc/react";
import { useState } from "react";

interface OpenCashRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OpenCashRegisterDialog({
  open,
  onOpenChange,
  onSuccess,
}: OpenCashRegisterDialogProps) {
  const [initialAmount, setInitialAmount] = useState("");

  const openMutation = api.cashRegister.open.useMutation({
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      setInitialAmount("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(initialAmount.replace(",", ".")) || 0;
    openMutation.mutate({ initialAmount: amount });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
          <DialogDescription>Informe o valor inicial para abrir o caixa do dia</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="initialAmount">Valor Inicial (R$)</Label>
              <Input
                id="initialAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Valor em dinheiro disponível no início do expediente
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={openMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={openMutation.isPending || !initialAmount}>
              {openMutation.isPending ? "Abrindo..." : "Confirmar Abertura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
