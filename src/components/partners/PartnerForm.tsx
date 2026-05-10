"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { CommissionType, PartnerType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const partnerTypeLabels: Record<string, string> = {
  SUPPLIER: "Fornecedor",
  AFFILIATE: "Afiliado",
  DISTRIBUTOR: "Distribuidor",
  SERVICE_PROVIDER: "Prestador de Serviço",
  OTHER: "Outro",
};

const commissionTypeLabels: Record<string, string> = {
  PERCENTAGE: "Percentual (%)",
  FIXED: "Valor Fixo (R$)",
  HYBRID: "Híbrido",
};

interface PartnerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultValues?: Record<string, unknown>;
  partnerId?: string;
}

export function PartnerForm({
  open,
  onOpenChange,
  onSuccess,
  defaultValues,
  partnerId,
}: PartnerFormProps) {
  const { toast } = useToast();
  const utils = api.useUtils();
  const isEditing = !!partnerId;

  const [name, setName] = useState("");
  const [type, setType] = useState<PartnerType>(PartnerType.SUPPLIER);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [commissionType, setCommissionType] = useState<CommissionType>(CommissionType.PERCENTAGE);
  const [commissionValue, setCommissionValue] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (defaultValues) {
      setName((defaultValues.name as string) ?? "");
      setType((defaultValues.type as PartnerType) ?? PartnerType.SUPPLIER);
      setEmail((defaultValues.email as string) ?? "");
      setPhone((defaultValues.phone as string) ?? "");
      setDocument((defaultValues.document as string) ?? "");
      setPixKey((defaultValues.pixKey as string) ?? "");
      setBankName((defaultValues.bankName as string) ?? "");
      setBankAgency((defaultValues.bankAgency as string) ?? "");
      setBankAccount((defaultValues.bankAccount as string) ?? "");
      setBankAccountType((defaultValues.bankAccountType as string) ?? "");
      setCommissionType(
        (defaultValues.commissionType as CommissionType) ?? CommissionType.PERCENTAGE,
      );
      setCommissionValue(Number(defaultValues.commissionValue) ?? 0);
      setNotes((defaultValues.notes as string) ?? "");
    } else {
      setName("");
      setType(PartnerType.SUPPLIER);
      setEmail("");
      setPhone("");
      setDocument("");
      setPixKey("");
      setBankName("");
      setBankAgency("");
      setBankAccount("");
      setBankAccountType("");
      setCommissionType(CommissionType.PERCENTAGE);
      setCommissionValue(0);
      setNotes("");
    }
  }, [defaultValues]);

  const createMutation = api.partner.create.useMutation({
    onSuccess: () => {
      toast({ title: "Parceiro cadastrado com sucesso!" });
      utils.partner.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar parceiro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = api.partner.update.useMutation({
    onSuccess: () => {
      toast({ title: "Parceiro atualizado!" });
      utils.partner.list.invalidate();
      utils.partner.byId.invalidate({ id: partnerId! });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      type,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      document: document.trim() || undefined,
      pixKey: pixKey.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAgency: bankAgency.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      bankAccountType: bankAccountType.trim() || undefined,
      commissionType,
      commissionValue,
      notes: notes.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: partnerId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Parceiro" : "Novo Parceiro"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do parceiro"
              : "Cadastre um novo parceiro (fornecedor, afiliado, etc.)"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="partner-name">Nome *</Label>
            <Input
              id="partner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do parceiro"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Parceiro *</Label>
            <Select value={type} onValueChange={(v) => setType(v as PartnerType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(partnerTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="partner-email">E-mail</Label>
              <Input
                id="partner-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partner-phone">Telefone</Label>
              <Input
                id="partner-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-8888"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partner-doc">CPF / CNPJ</Label>
            <Input
              id="partner-doc"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dados Bancários
            </Label>

            <div className="space-y-1.5">
              <Label htmlFor="partner-pix">Chave PIX</Label>
              <Input
                id="partner-pix"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou aleatória"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="partner-bank">Banco</Label>
                <Input
                  id="partner-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Nubank"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partner-acct-type">Tipo de Conta</Label>
                <Input
                  id="partner-acct-type"
                  value={bankAccountType}
                  onChange={(e) => setBankAccountType(e.target.value)}
                  placeholder="Corrente / Poupança"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="partner-agency">Agência</Label>
                <Input
                  id="partner-agency"
                  value={bankAgency}
                  onChange={(e) => setBankAgency(e.target.value)}
                  placeholder="0001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partner-acct">Conta</Label>
                <Input
                  id="partner-acct"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="000000-0"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Regras de Comissão / Repasse
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={commissionType}
                  onValueChange={(v) => setCommissionType(v as CommissionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(commissionTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partner-comm-value">
                  {commissionType === "PERCENTAGE" ? "Percentual (%)" : "Valor (R$)"}
                </Label>
                <Input
                  id="partner-comm-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partner-notes">Observações</Label>
            <Textarea
              id="partner-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas sobre este parceiro..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEditing ? "Salvar alterações" : "Cadastrar parceiro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
