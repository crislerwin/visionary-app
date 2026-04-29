"use client";

import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import { MemberRole } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, MoreHorizontal, UserPlus } from "lucide-react";
import Link from "next/link";

import { InviteMemberForm } from "@/components/team/invite-member-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data, isLoading, refetch } = api.team.list.useQuery(
    { tenantId: currentTenant?.id || "" },
    { enabled: !!currentTenant?.id },
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

  if (isLoading) {
    return <TeamSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
            <p className="text-muted-foreground">Gerencie membros e convites do time</p>
          </div>
        </div>

        {data?.canManageRoles && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
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
              <InviteMemberForm tenantId={currentTenant?.id || ""} onSuccess={() => refetch()} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data?.members.map((member) => (
              <div
                key={member.user.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {member.user.name?.charAt(0).toUpperCase() ||
                        member.user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.user.name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant={roleColors[member.role]}>{roleLabels[member.role]}</Badge>
                  <p className="text-sm text-muted-foreground hidden md:block">
                    {formatDistanceToNow(new Date(member.joinedAt || member.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>

                  {data?.canManageRoles && (
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
                                  tenantId: currentTenant?.id || "",
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
                                  tenantId: currentTenant?.id || "",
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
                                  tenantId: currentTenant?.id || "",
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
                              tenantId: currentTenant?.id || "",
                              userId: member.userId,
                            })
                          }
                          disabled={member.userId === data?.currentUserRole} // Can't remove self
                        >
                          Remover do time
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {data?.pendingInvites && data.pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Expira em{" "}
                        {formatDistanceToNow(new Date(invite.expiresAt), {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{roleLabels[invite.role]}</Badge>
                    {data?.canManageRoles && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          cancelInvite.mutate({
                            tenantId: currentTenant?.id || "",
                            inviteId: invite.id,
                          })
                        }
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-20" />
        </CardHeader>
        <CardContent className="p-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
