"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { api } from "@/lib/trpc/react";
import { LeadStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, ClipboardList, Clock, ThumbsDown, ThumbsUp } from "lucide-react";
import * as React from "react";

import { ApproveLeadDialog } from "@/components/leads/approve-lead-dialog";
import { RejectLeadDialog } from "@/components/leads/reject-lead-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableRowActions } from "@/components/ui/table-row-actions";
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

export default function LeadsPageClient() {
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

          if (lead.status === LeadStatus.PENDING) {
            return (
              <TableRowActions
                actions={[
                  {
                    label: "Aprovar",
                    icon: ThumbsUp,
                    onClick: () => handleAction(lead.id, "approve"),
                  },
                  {
                    label: "Rejeitar",
                    icon: ThumbsDown,
                    onClick: () => handleAction(lead.id, "reject"),
                    destructive: true,
                  },
                ]}
              />
            );
          }

          if (lead.status === LeadStatus.APPROVED && lead.tenant) {
            return <span className="text-sm text-muted-foreground">{lead.tenant.name}</span>;
          }

          if (lead.status === LeadStatus.REJECTED && lead.rejectionReason) {
            return (
              <span className="text-sm text-muted-foreground max-w-[200px] truncate inline-block">
                {lead.rejectionReason}
              </span>
            );
          }

          return null;
        },
      },
    ],
    // biome-ignore lint/correctness/useExhaustiveDependencies: handleAction is stable
    [handleAction],
  );

  const leads = (data?.leads as Lead[]) ?? [];
  const totalLeads = data?.total ?? 0;
  const pendingCount = leads.filter((l) => l.status === LeadStatus.PENDING).length;
  const approvedCount = leads.filter((l) => l.status === LeadStatus.APPROVED).length;
  const rejectedCount = leads.filter((l) => l.status === LeadStatus.REJECTED).length;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Leads"
          description="Gerencie solicitações de acesso"
          action={
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as LeadStatus | "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value={LeadStatus.PENDING}>Pendentes</SelectItem>
                <SelectItem value={LeadStatus.APPROVED}>Aprovados</SelectItem>
                <SelectItem value={LeadStatus.REJECTED}>Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold">{totalLeads}</div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pendentes</CardTitle>
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold text-yellow-600">{pendingCount}</div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Aprovados / Rejeitados
              </CardTitle>
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold">
                  <span className="text-green-600">{approvedCount}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-red-600">{rejectedCount}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card className="gap-0 p-0 overflow-hidden">
          <CardHeader className="px-3 pt-3 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4" />
              {data ? `${data.total} lead(s)` : "Carregando..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
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
    </PageContainer>
  );
}
