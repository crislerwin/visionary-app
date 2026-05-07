"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowDownLeft, MinusCircle, PlusCircle } from "lucide-react";

interface Transaction {
  id: string;
  type: "SALE" | "EXPENSE" | "WITHDRAWAL" | "INITIAL";
  amount: number | string;
  description: string | null;
  category: string | null;
  createdAt: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
}

const TRANSACTION_ICONS = {
  SALE: ArrowDownLeft,
  EXPENSE: MinusCircle,
  WITHDRAWAL: MinusCircle,
  INITIAL: PlusCircle,
};

const TRANSACTION_COLORS = {
  SALE: "text-green-600 bg-green-50",
  EXPENSE: "text-red-600 bg-red-50",
  WITHDRAWAL: "text-orange-600 bg-orange-50",
  INITIAL: "text-blue-600 bg-blue-50",
};

const TRANSACTION_LABELS = {
  SALE: "Venda",
  EXPENSE: "Despesa",
  WITHDRAWAL: "Sangria",
  INITIAL: "Abertura",
};

export function TransactionsList({ transactions }: TransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8 px-3">
        Nenhuma movimentação registrada
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3 pb-3">
      {transactions.map((transaction) => {
        const Icon = TRANSACTION_ICONS[transaction.type];
        const isEntry = transaction.type === "SALE" || transaction.type === "INITIAL";

        return (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${TRANSACTION_COLORS[transaction.type]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">{transaction.description}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {TRANSACTION_LABELS[transaction.type]}
                  </Badge>
                  {transaction.category && (
                    <span className="capitalize">{transaction.category}</span>
                  )}
                  <span>•</span>
                  <span>{formatDateTime(transaction.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className={`font-bold ${isEntry ? "text-green-600" : "text-red-600"}`}>
              {isEntry ? "+" : "-"}
              {formatCurrency(Number(transaction.amount))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
