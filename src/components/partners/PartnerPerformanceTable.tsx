"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export interface PartnerPerformanceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  commissionType: string;
  commissionValue: number;
  totalReceived: number;
  totalPaid: number;
  netProfit: number;
  transactionCount: number;
}

const partnerTypeLabels: Record<string, string> = {
  SUPPLIER: "Fornecedor",
  AFFILIATE: "Afiliado",
  DISTRIBUTOR: "Distribuidor",
  SERVICE_PROVIDER: "Prestador",
  OTHER: "Outro",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ProfitIndicator({ profit }: { profit: number }) {
  if (profit > 0) {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="text-xs">Lucro</span>
      </div>
    );
  }
  if (profit < 0) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-3.5 w-3.5" />
        <span className="text-xs">Prejuízo</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-3.5 w-3.5" />
      <span className="text-xs">Neutro</span>
    </div>
  );
}

export const partnerPerformanceColumns: ColumnDef<PartnerPerformanceItem>[] = [
  {
    accessorKey: "name",
    header: "Parceiro",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div>
          <div className="font-medium">{p.name}</div>
          {p.commissionValue > 0 && (
            <div className="text-xs text-muted-foreground">
              {p.commissionType === "PERCENTAGE"
                ? `${p.commissionValue}%`
                : `R$ ${p.commissionValue.toFixed(2)}`}{" "}
              comissão
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => (
      <span className="text-sm">
        {partnerTypeLabels[row.getValue("type") as string] ?? row.getValue("type")}
      </span>
    ),
  },
  {
    accessorKey: "transactionCount",
    header: "Transações",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("transactionCount")}</span>
    ),
  },
  {
    accessorKey: "totalReceived",
    header: "Recebido",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-emerald-600">
        {formatCurrency(Number(row.getValue("totalReceived")))}
      </span>
    ),
  },
  {
    accessorKey: "totalPaid",
    header: "Pago",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-red-600">
        {formatCurrency(Number(row.getValue("totalPaid")))}
      </span>
    ),
  },
  {
    accessorKey: "netProfit",
    header: "Resultado",
    cell: ({ row }) => {
      const profit = Number(row.getValue("netProfit"));
      return (
        <div>
          <div className="font-mono text-sm font-medium">{formatCurrency(profit)}</div>
          <ProfitIndicator profit={profit} />
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("status") === "ACTIVE" ? "default" : "secondary"}>
        {row.getValue("status") === "ACTIVE" ? "Ativo" : "Inativo"}
      </Badge>
    ),
  },
];

interface PartnerPerformanceTableProps {
  partners: PartnerPerformanceItem[];
}

export function PartnerPerformanceTable({ partners }: PartnerPerformanceTableProps) {
  return (
    <DataTable
      columns={partnerPerformanceColumns}
      data={partners}
      searchKey="name"
      searchPlaceholder="Buscar parceiro..."
      title="Desempenho por Parceiro"
      description="Transações financeiras agrupadas por parceiro de negócio"
    />
  );
}
