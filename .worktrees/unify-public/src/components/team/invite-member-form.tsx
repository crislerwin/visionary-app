"use client";

import { api } from "@/lib/trpc/react";
import { MemberRole } from "@prisma/client";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InviteMemberFormProps {
  tenantId: string;
  onSuccess?: () => void;
}

type InviteRole = Exclude<MemberRole, "OWNER">;

type InviteResult = {
  email: string;
  role: string;
  directMember: boolean;
  token?: string;
};

const roleLabels: Record<InviteRole, string> = {
  [MemberRole.ADMIN]: "Administrador",
  [MemberRole.MEMBER]: "Membro",
  [MemberRole.VIEWER]: "Visualizador",
};

function buildInviteLink(token: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/invite/${token}`;
}

export function InviteMemberForm({ tenantId, onSuccess }: InviteMemberFormProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<InviteRole>(MemberRole.MEMBER);
  const [result, setResult] = React.useState<InviteResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const invite = api.team.invite.useMutation({
    onError: (err) => {
      setError(err.message);
    },
    onSuccess: (data) => {
      setResult({
        email: data.email,
        role: data.role,
        directMember: (data as { directMember?: boolean }).directMember ?? false,
        token: (data as { token?: string }).token,
      });
      setEmail("");
      onSuccess?.();
    },
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    invite.mutate({ tenantId, email, role });
  }

  if (result) {
    const inviteLink = result.token ? buildInviteLink(result.token) : "";
    return (
      <div className="text-center space-y-4 py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
          <Icons.check className="w-6 h-6" />
        </div>
        {result.directMember ? (
          <>
            <h3 className="text-lg font-semibold">Membro adicionado!</h3>
            <p className="text-sm text-muted-foreground">
              {result.email} já tem acesso ao estabelecimento como{" "}
              {roleLabels[result.role as InviteRole] ?? result.role}.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold">Convite criado!</h3>
            <p className="text-sm text-muted-foreground">
              Compartilhe o link abaixo com {result.email}:
            </p>
            <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
              <code className="flex-1 text-xs break-all text-left">{inviteLink}</code>
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 h-8 w-8"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <Icons.check className="h-4 w-4 text-green-600" />
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-label="Copiar link"
                    role="img"
                  >
                    <title>Copiar link</title>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">O convite expira em 7 dias.</p>
          </>
        )}
        <Button
          onClick={() => {
            setResult(null);
            setEmail("");
          }}
          variant="outline"
        >
          {result.directMember ? "Adicionar outro" : "Criar outro convite"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={invite.isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <Select
          value={role}
          onValueChange={(value) => setRole(value as InviteRole)}
          disabled={invite.isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MemberRole.ADMIN}>{roleLabels[MemberRole.ADMIN]}</SelectItem>
            <SelectItem value={MemberRole.MEMBER}>{roleLabels[MemberRole.MEMBER]}</SelectItem>
            <SelectItem value={MemberRole.VIEWER}>{roleLabels[MemberRole.VIEWER]}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {role === MemberRole.ADMIN &&
            "Pode gerenciar produtos, pedidos e membros (exceto owner)."}
          {role === MemberRole.MEMBER && "Pode gerenciar produtos e pedidos."}
          {role === MemberRole.VIEWER && "Apenas visualização, sem permissão de edição."}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={invite.isPending || !email}>
          {invite.isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Enviar convite
        </Button>
      </div>
    </form>
  );
}
