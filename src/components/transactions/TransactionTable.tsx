"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/trpc/react";
import { cn, formatDate } from "@/lib/utils";
import { TransactionStatus, TransactionType } from "@prisma/client";

interface TransactionTableProps {
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  filters?: {
    type?: TransactionType;
    status?: TransactionStatus;
    bankAccountId?: string;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

interface Transaction {
  id: string;
  amount: number | string;
  type: TransactionType;
  description: string | null;
  date: Date | string;
  status: TransactionStatus;
  bankAccount: {
    id: string;
    name: string;
    currency: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
}

// Helper to normalize transaction from API
type NormalizedTransaction = {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  date: Date;
  status: TransactionStatus;
  bankAccount: {
    id: string;
    name: string;
    currency: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
};

const normalizeTransaction = (t: Transaction): NormalizedTransaction => ({
  ...t,
  amount: typeof t.amount === "string" ? Number(t.amount) : t.amount,
  description: t.description ?? "",
  date: t.date instanceof Date ? t.date : new Date(t.date),
});

export function TransactionTable({ onEdit, onDelete, filters }: TransactionTableProps) {
  const { t } = useTranslation("common");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Reset pagination whenever external filters change
  useEffect(() => {
    setPage(0);
  }, [filters?.type, filters?.status, filters?.bankAccountId, filters?.categoryId, filters?.startDate, filters?.endDate]);

  const { data, isLoading } = api.transaction.list.useQuery({
    type: filters?.type,
    status: filters?.status,
    bankAccountId: filters?.bankAccountId,
    categoryId: filters?.categoryId,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    limit: pageSize,
    offset: page * pageSize,
  });

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="w-[50px]">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((rawTransaction: Transaction) => {
                const transaction = normalizeTransaction(rawTransaction);
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.type === TransactionType.INCOME ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{transaction.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.category ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: transaction.category.color }}
                          />
                          <span>{transaction.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          transaction.status === TransactionStatus.COMPLETED &&
                            "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          transaction.status === TransactionStatus.PENDING &&
                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                          transaction.status === TransactionStatus.CANCELLED &&
                            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                        )}
                      >
                        {transaction.status.toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        transaction.type === TransactionType.INCOME
                          ? "text-green-600"
                          : "text-red-600",
                      )}
                    >
                      {transaction.type === TransactionType.INCOME ? "+" : "-"}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: transaction.bankAccount.currency,
                      }).format(Number(transaction.amount))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t("actions")}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(transaction)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(transaction)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}{" "}
            transactions
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
