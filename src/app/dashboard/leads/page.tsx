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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = React.useState<LeadStatus | "ALL">("PENDING");
  const [page, setPage] = React.useState(1);
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const { data, isLoading, refetch } = api.lead.list.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    page,
    pageSize: 20,
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

  const { totalPages = 1 } = data || {};

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
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum lead encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.phone || "-"}</TableCell>
                        <TableCell>
                          {lead.businessSize
                            ? businessSizeLabels[lead.businessSize] || lead.businessSize
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[lead.status]}>
                            {statusLabels[lead.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(lead.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
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
                            <span className="text-sm text-muted-foreground">
                              {lead.tenant.name}
                            </span>
                          )}
                          {lead.status === LeadStatus.REJECTED && lead.rejectionReason && (
                            <span className="text-sm text-muted-foreground max-w-[200px] truncate inline-block">
                              {lead.rejectionReason}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próximo
                  </Button>
                </div>
              )}
            </>
          )}
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
