"use client";

import { ArrowDownLeft, ArrowUpRight, Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2 } from "lucide-react";

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
  amount: typeof t.amount === 'string' ? Number(t.amount) : t.amount,
  description: t.description ?? '',
  date: t.date instanceof Date ? t.date : new Date(t.date),
});

export function TransactionTable({
  onEdit,
  onDelete,
  filters,
}: TransactionTableProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;

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

  const { data: bankAccounts } = api.bankAccount.list.useQuery(undefined);
  const { data: categoriesData } = api.category.list.useQuery({});
  const categories = categoriesData?.categories ?? [];

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
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters?.type || "all"}
          onValueChange={(value) => {
            // This would be handled by parent component
            console.log("Filter type:", value);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
            <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters?.status || "all"}
          onValueChange={(value) => {
            console.log("Filter status:", value);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={TransactionStatus.COMPLETED}>Completed</SelectItem>
            <SelectItem value={TransactionStatus.PENDING}>Pending</SelectItem>
            <SelectItem value={TransactionStatus.CANCELLED}>Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters?.bankAccountId || "all"}
          onValueChange={(value) => {
            console.log("Filter account:", value);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {bankAccounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters?.categoryId || "all"}
          onValueChange={(value) => {
            console.log("Filter category:", value);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((rawTransaction) => {
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
                      <span className="font-medium">
                        {transaction.description}
                      </span>
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
                  <TableCell>{transaction.bankAccount.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        transaction.status === TransactionStatus.COMPLETED &&
                          "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                        transaction.status === TransactionStatus.PENDING &&
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                        transaction.status === TransactionStatus.CANCELLED &&
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
                        : "text-red-600"
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
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(transaction)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(transaction)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to{" "}
            {Math.min((page + 1) * pageSize, total)} of {total} transactions
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
