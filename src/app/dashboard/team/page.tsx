"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import { MemberRole } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Shield, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { InviteMemberForm } from "@/components/team/invite-member-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";

type Member = {
  userId: string;
  role: MemberRole;
  joinedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: string;
  };
};

type Invite = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
};

const roleLabels: Record<MemberRole, string> = {
  [MemberRole.OWNER]: "Proprietário",
  [MemberRole.ADMIN]: "Administrador",
  [MemberRole.MEMBER]: "Membro",
  [MemberRole.VIEWER]: "Visualizador",
};

const roleColors: Record<MemberRole, "default" | "secondary" | "destructive" | "outline"> = {
  [MemberRole.OWNER]: "default",
  [MemberRole.ADMIN]: "secondary",
  [MemberRole.MEMBER]: "outline",
  [MemberRole.VIEWER]: "secondary",
};

export default function TeamPage() {
  const { currentTenant } = useCurrentTenant();
  const tenantId = currentTenant?.id || "";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, refetch } = api.team.list.useQuery(
    { tenantId },
    { enabled: !!tenantId },
  );

  const updateRole = api.team.updateRole.useMutation({
    onSuccess: () => refetch(),
  });

  const removeMember = api.team.remove.useMutation({
    onSuccess: () => refetch(),
  });

  const cancelInvite = api.team.cancelInvite.useMutation({
    onSuccess: () => refetch(),
  });

  const memberColumns = useMemo<ColumnDef<Member>[]>(
    () => [
      {
        accessorKey: "user.name",
        header: "Nome",
        cell: ({ row }) => {
          const member = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {member.user.name?.charAt(0).toUpperCase() ||
                    member.user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.user.name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Papel",
        cell: ({ row }) => (
          <Badge variant={roleColors[row.getValue("role") as MemberRole]}>
            {roleLabels[row.getValue("role") as MemberRole]}
          </Badge>
        ),
      },
      {
        accessorKey: "joinedAt",
        header: "Entrou",
        cell: ({ row }) => {
          const date = row.original.joinedAt || row.original.createdAt;
          return (
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const member = row.original;
          if (!data?.canManageRoles) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {data.isOwner && member.role !== MemberRole.OWNER && (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate({
                            tenantId,
                            userId: member.userId,
                            role: MemberRole.ADMIN,
                          })
                        }
                        disabled={member.role === MemberRole.ADMIN}
                      >
                        Tornar Administrador
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate({
                            tenantId,
                            userId: member.userId,
                            role: MemberRole.MEMBER,
                          })
                        }
                        disabled={member.role === MemberRole.MEMBER}
                      >
                        Tornar Membro
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate({
                            tenantId,
                            userId: member.userId,
                            role: MemberRole.VIEWER,
                          })
                        }
                        disabled={member.role === MemberRole.VIEWER}
                      >
                        Tornar Visualizador
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() =>
                      removeMember.mutate({
                        tenantId,
                        userId: member.userId,
                      })
                    }
                    disabled={member.userId === data?.currentUserRole}
                  >
                    Remover do time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [data, tenantId, updateRole, removeMember],
  );

  const inviteColumns = useMemo<ColumnDef<Invite>[]>(
    () => [
      {
        accessorKey: "email",
        header: "E-mail",
        cell: ({ row }) => {
          const invite = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  Expira em {formatDistanceToNow(new Date(invite.expiresAt), { locale: ptBR })}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Papel",
        cell: ({ row }) => (
          <Badge variant={roleColors[row.getValue("role") as MemberRole]}>
            {roleLabels[row.getValue("role") as MemberRole]}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          if (!data?.canManageRoles) return null;
          return (
            <div className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  cancelInvite.mutate({
                    tenantId,
                    inviteId: row.original.id,
                  })
                }
              >
                Cancelar
              </Button>
            </div>
          );
        },
      },
    ],
    [data, tenantId, cancelInvite],
  );

  const members = (data?.members ?? []) as Member[];
  const invites = (data?.pendingInvites ?? []) as Invite[];

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Equipe"
          description="Gerencie membros e convites do time"
          action={
            data?.canManageRoles ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Convidar membro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convidar membro</DialogTitle>
                    <DialogDescription>
                      Envie um convite por e-mail para adicionar alguém ao time.
                    </DialogDescription>
                  </DialogHeader>
                  <InviteMemberForm tenantId={tenantId} onSuccess={() => refetch()} />
                </DialogContent>
              </Dialog>
            ) : undefined
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total de Membros
              </CardTitle>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold">{members.length}</div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Administradores
              </CardTitle>
              <Shield className="h-3.5 w-3.5 text-blue-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold">
                  {
                    members.filter(
                      (m) => m.role === MemberRole.ADMIN || m.role === MemberRole.OWNER,
                    ).length
                  }
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Convites Pendentes
              </CardTitle>
              <UserPlus className="h-3.5 w-3.5 text-yellow-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-xl font-bold">{invites.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Members Table */}
        <Card className="gap-0 p-0 overflow-hidden">
          <CardHeader className="px-3 pt-3 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Membros
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <DataTable
              columns={memberColumns}
              data={members}
              isLoading={isLoading}
              totalItems={members.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>

        {/* Pending Invites Table */}
        {invites.length > 0 && (
          <Card className="gap-0 p-0 overflow-hidden">
            <CardHeader className="px-3 pt-3 pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserPlus className="h-4 w-4" />
                Convites pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-2">
              <DataTable
                columns={inviteColumns}
                data={invites}
                totalItems={invites.length}
                currentPage={1}
                pageSize={invites.length}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
