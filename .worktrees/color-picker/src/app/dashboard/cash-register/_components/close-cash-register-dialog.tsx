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
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

interface CloseCashRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegister: {
    id: string;
    currentBalance: number;
    totalEntries: number;
    totalExits: number;
  };
  onSuccess: () => void;
}

export function CloseCashRegisterDialog({
  open,
  onOpenChange,
  cashRegister,
  onSuccess,
}: CloseCashRegisterDialogProps) {
  const [finalAmount, setFinalAmount] = useState("");
  const [notes, setNotes] = useState("");

  const closeMutation = api.cashRegister.close.useMutation({
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      setFinalAmount("");
      setNotes("");
    },
  });

  const expectedAmount = cashRegister.currentBalance || 0;
  const finalAmountNum = Number.parseFloat(finalAmount.replace(",", ".")) || 0;
  const difference = finalAmountNum - expectedAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeMutation.mutate({
      finalAmount: finalAmountNum,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
          <DialogDescription>Informe o valor contado para fechar o caixa</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Saldo Esperado</Label>
              <div className="text-2xl font-bold">{formatCurrency(expectedAmount)}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalAmount">Valor Contado (R$)</Label>
              <Input
                id="finalAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                required
              />
            </div>

            {finalAmount && (
              <div className="space-y-2 rounded-lg bg-muted p-3">
                <div className="flex justify-between">
                  <span>Diferença:</span>
                  <span
                    className={`font-bold ${
                      difference < 0 ? "text-red-600" : difference > 0 ? "text-green-600" : ""
                    }`}
                  >
                    {difference < 0 ? "Falta: " : difference > 0 ? "Sobra: " : ""}
                    {formatCurrency(Math.abs(difference))}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Input
                id="notes"
                placeholder="Observações sobre o fechamento"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Resumo:</p>
              <ul className="mt-1 space-y-1">
                <li>Total entradas: {formatCurrency(cashRegister.totalEntries)}</li>
                <li>Total saídas: {formatCurrency(cashRegister.totalExits)}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={closeMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={closeMutation.isPending || !finalAmount}>
              {closeMutation.isPending ? "Fechando..." : "Confirmar Fechamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
