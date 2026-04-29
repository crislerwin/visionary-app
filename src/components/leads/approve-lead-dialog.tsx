"use client";

import { api } from "@/lib/trpc/react";
import { MemberRole } from "@prisma/client";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ApproveLeadDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  lead: {
    name: string;
    email: string;
    businessSize?: string | null;
    phone?: string | null;
  } | null;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  MEMBER: "Membro",
  VIEWER: "Visualizador",
};

export function ApproveLeadDialog({ open, onClose, leadId, lead }: ApproveLeadDialogProps) {
  const [tenantName, setTenantName] = React.useState(lead?.name || "");
  const [tenantSlug, setTenantSlug] = React.useState("");
  const [role, setRole] = React.useState<"ADMIN" | "MEMBER" | "VIEWER">("ADMIN");
  const [error, setError] = React.useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const approve = api.lead.approve.useMutation({
    onError: (err) => setError(err.message),
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);

    const slug =
      tenantSlug ||
      tenantName
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    approve.mutate({
      leadId,
      tenantName: tenantName || undefined,
      tenantSlug: slug || undefined,
      role,
    });
  }

  function handleCopy() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose() {
    setInviteUrl(null);
    setCopied(false);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar lead</DialogTitle>
          <DialogDescription>
            {lead?.name} ({lead?.email})
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <Icons.check className="h-5 w-5" />
                <span className="font-medium">Lead aprovado com sucesso!</span>
              </div>
              <p className="text-sm text-green-700">
                Envie o link abaixo para {lead?.email} definir a senha e acessar o sistema:
              </p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="flex-1 text-xs" />
                <Button type="button" size="sm" onClick={handleCopy} variant="outline">
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nome do estabelecimento</Label>
              <Input
                id="tenantName"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Ex: Restaurante Sabor & Arte"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Slug (URL)</Label>
              <Input
                id="tenantSlug"
                value={tenantSlug}
                onChange={(e) =>
                  setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="Deixe em branco para gerar automaticamente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Papel</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER" | "VIEWER")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MemberRole.ADMIN}>{roleLabels.ADMIN}</SelectItem>
                  <SelectItem value={MemberRole.MEMBER}>{roleLabels.MEMBER}</SelectItem>
                  <SelectItem value={MemberRole.VIEWER}>{roleLabels.VIEWER}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={approve.isPending}>
                {approve.isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Aprovar e criar acesso
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
