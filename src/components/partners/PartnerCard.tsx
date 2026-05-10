"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Pencil, Percent, Phone, Trash2 } from "lucide-react";

interface PartnerCardProps {
  partner: {
    id: string;
    name: string;
    type: string;
    email: string | null;
    phone: string | null;
    commissionType: string;
    commissionValue: number;
    status: string;
    _count: { invoices: number };
  };
  onEdit: (partner: PartnerCardProps["partner"]) => void;
  onDelete: (id: string) => void;
}

const partnerTypeLabels: Record<string, string> = {
  SUPPLIER: "Fornecedor",
  AFFILIATE: "Afiliado",
  DISTRIBUTOR: "Distribuidor",
  SERVICE_PROVIDER: "Prestador",
  OTHER: "Outro",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  INACTIVE: "bg-muted text-muted-foreground",
  BLOCKED: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
};

function formatCommission(partner: PartnerCardProps["partner"]) {
  if (partner.commissionValue <= 0) return "Sem comissão";
  if (partner.commissionType === "PERCENTAGE") return `${partner.commissionValue}%`;
  if (partner.commissionType === "FIXED") return `R$ ${partner.commissionValue.toFixed(2)}`;
  return `R$ ${partner.commissionValue.toFixed(2)} + %`;
}

export function PartnerCard({ partner, onEdit, onDelete }: PartnerCardProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-sm truncate">{partner.name}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {partnerTypeLabels[partner.type] ?? partner.type}
              </Badge>
              <Badge className={`text-[10px] ${statusColors[partner.status] ?? ""}`}>
                {statusLabels[partner.status] ?? partner.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
              {partner.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {partner.email}
                </span>
              )}
              {partner.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {partner.phone}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Percent className="h-3 w-3" />
                {formatCommission(partner)}
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-muted-foreground">
                {partner._count.invoices} fatura{partner._count.invoices !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(partner)} title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(partner.id)}
              className="text-destructive hover:text-destructive"
              title="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
