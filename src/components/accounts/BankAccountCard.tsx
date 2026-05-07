"use client";

import { ArrowRightLeft, CreditCard, Edit2, Landmark, PiggyBank, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BankAccountType } from "@prisma/client";
import { ConnectBankModal } from "./ConnectBankModal";

interface BankAccountCardProps {
  account: {
    id: string;
    name: string;
    type: BankAccountType;
    currency: string;
    currentBalance: number;
    _count?: {
      transactions: number;
    };
  };
  onEdit: () => void;
  onDelete: () => void;
}

function getAccountIcon(type: BankAccountType) {
  switch (type) {
    case BankAccountType.CHECKING:
      return Landmark;
    case BankAccountType.SAVINGS:
      return PiggyBank;
    case BankAccountType.CREDIT:
      return CreditCard;
    default:
      return Landmark;
  }
}

function getAccountTypeLabel(type: BankAccountType) {
  switch (type) {
    case BankAccountType.CHECKING:
      return "Checking Account";
    case BankAccountType.SAVINGS:
      return "Savings Account";
    case BankAccountType.CREDIT:
      return "Credit Card";
    default:
      return "Account";
  }
}

export function BankAccountCard({ account, onEdit, onDelete }: BankAccountCardProps) {
  const Icon = getAccountIcon(account.type);
  const transactionCount = account._count?.transactions ?? 0;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{account.name}</CardTitle>
            <CardDescription>{getAccountTypeLabel(account.type)}</CardDescription>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: account.currency,
              }).format(Number(account.currentBalance))}
            </span>
            <span className="text-sm text-muted-foreground">{account.currency}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Pluggy Connect Bank — UI placeholder */}
        <div className="mt-4">
          <ConnectBankModal accountName={account.name} />
        </div>
      </CardContent>
    </Card>
  );
}
