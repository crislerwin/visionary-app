"use client";

import { api } from "@/lib/trpc/react";
import { LeadStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";

import { ApproveLeadDialog } from "@/components/leads/approve-lead-dialog";
import { RejectLeadDialog } from "@/components/leads/reject-lead-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnDef } from "@tanstack/react-table";

const statusLabels: Record<LeadStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const statusColors: Record<LeadStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

const businessSizeLabels: Record<string, string> = {
  SOLO: "Solo",
  SMALL: "Pequeno",
  MEDIUM: "Médio",
  LARGE: "Grande",
};

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessSize: string | null;
  status: LeadStatus;
  createdAt: string;
  tenant: { id: string; name: string; slug: string } | null;
  rejectionReason: string | null;
};

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = React.useState<LeadStatus | "ALL">("PENDING");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const { data, isLoading, refetch } = api.lead.list.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    page,
    pageSize,
  });

  const leadDetail = api.lead.get.useQuery(
    { leadId: selectedLeadId || "" },
    { enabled: !!selectedLeadId },
  );

  const handleAction = (leadId: string, action: "approve" | "reject") => {
    setSelectedLeadId(leadId);
    if (action === "approve") {
      setApproveOpen(true);
    } else {
      setRejectOpen(true);
    }
  };

  const handleClose = () => {
    setSelectedLeadId(null);
    setApproveOpen(false);
    setRejectOpen(false);
    refetch();
  };

  const columns = React.useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
      },
      {
        accessorKey: "email",
        header: "E-mail",
      },
      {
        accessorKey: "phone",
        header: "Telefone",
        cell: ({ row }) => (row.getValue("phone") as string | null) || "-",
      },
      {
        accessorKey: "businessSize",
        header: "Tamanho",
        cell: ({ row }) => {
          const size = row.getValue("businessSize") as string | null;
          return size ? businessSizeLabels[size] || size : "-";
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as LeadStatus;
          return <Badge variant={statusColors[status]}>{statusLabels[status]}</Badge>;
        },
      },
      {
        accessorKey: "createdAt",
        header: "Criado",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(row.getValue("createdAt")), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="text-right">
              {lead.status === LeadStatus.PENDING && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAction(lead.id, "approve")}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAction(lead.id, "reject")}
                  >
                    Rejeitar
                  </Button>
                </div>
              )}
              {lead.status === LeadStatus.APPROVED && lead.tenant && (
                <span className="text-sm text-muted-foreground">{lead.tenant.name}</span>
              )}
              {lead.status === LeadStatus.REJECTED && lead.rejectionReason && (
                <span className="text-sm text-muted-foreground max-w-[200px] truncate inline-block">
                  {lead.rejectionReason}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    // biome-ignore lint/correctness/useExhaustiveDependencies: handleAction is stable
    [handleAction],
  );

  const leads = (data?.leads as Lead[]) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Gerencie solicitações de acesso</p>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as LeadStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value={LeadStatus.PENDING}>Pendentes</SelectItem>
            <SelectItem value={LeadStatus.APPROVED}>Aprovados</SelectItem>
            <SelectItem value={LeadStatus.REJECTED}>Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data ? `${data.total} lead(s)` : "Carregando..."}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={leads}
            isLoading={isLoading}
            totalItems={data?.total ?? 0}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {selectedLeadId && (
        <>
          <ApproveLeadDialog
            open={approveOpen}
            onClose={handleClose}
            leadId={selectedLeadId}
            lead={leadDetail.data || null}
          />
          <RejectLeadDialog open={rejectOpen} onClose={handleClose} leadId={selectedLeadId} />
        </>
      )}
    </div>
  );
}
