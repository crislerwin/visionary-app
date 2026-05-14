"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

const CONDITIONS = [
  { value: "balance_below" as const, label: "Saldo abaixo de", icon: AlertTriangle },
  { value: "invoice_overdue" as const, label: "Conta a pagar vencida", icon: Clock },
  { value: "revenue_target" as const, label: "Meta de receita", icon: TrendingUp },
];

const PRIORITIES = [
  { value: "LOW", label: "Baixa", color: "bg-blue-100 text-blue-600" },
  { value: "MEDIUM", label: "Média", color: "bg-yellow-100 text-yellow-600" },
  { value: "HIGH", label: "Alta", color: "bg-orange-100 text-orange-600" },
  { value: "CRITICAL", label: "Crítica", color: "bg-red-100 text-red-600" },
] as const;

type Condition = (typeof CONDITIONS)[number]["value"];
type Priority = (typeof PRIORITIES)[number]["value"];

export default function AlertsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    condition: "balance_below" as Condition,
    threshold: "",
    targetType: undefined as "BANK_ACCOUNT" | "PARTNER_INVOICE" | undefined,
    targetId: "",
    priority: "MEDIUM" as Priority,
  });

  const utils = api.useUtils();

  const { data: rules, isLoading } = api.alert.listRules.useQuery();
  const { data: bankAccounts } = api.bankAccount.list.useQuery();

  const createRule = api.alert.createRule.useMutation({
    onSuccess: () => {
      utils.alert.listRules.invalidate();
      setOpen(false);
      resetForm();
      console.info("Regra criada com sucesso!");
    },
    onError: (err) => console.error(err.message),
  });

  const updateRule = api.alert.updateRule.useMutation({
    onSuccess: () => {
      utils.alert.listRules.invalidate();
      setOpen(false);
      setEditing(null);
      resetForm();
      console.info("Regra atualizada!");
    },
    onError: (err) => console.error(err.message),
  });

  const deleteRule = api.alert.deleteRule.useMutation({
    onSuccess: () => {
      utils.alert.listRules.invalidate();
      console.info("Regra removida!");
    },
  });

  const checkAlerts = api.alert.check.useMutation({
    onSuccess: (res) => {
      if (res.created.length > 0) {
        console.info(`${res.created.length} alerta(s) gerado(s)!`);
        utils.alert.listNotifications.invalidate();
        utils.alert.unreadCount.invalidate();
      } else {
        console.info("Nenhum alerta no momento.");
      }
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      condition: "balance_below",
      threshold: "",
      targetType: undefined,
      targetId: "",
      priority: "MEDIUM",
    });
  };

  const onSubmit = () => {
    const data = {
      ...form,
      threshold: Number(form.threshold) || 0,
      ...(form.targetId ? { targetType: form.targetType, targetId: form.targetId } : {}),
    };
    if (editing) {
      updateRule.mutate({ id: editing, ...data });
    } else {
      createRule.mutate(data);
    }
  };

  const onToggle = (id: string, isActive: boolean) => {
    updateRule.mutate({ id, isActive: !isActive });
  };

  const onEdit = (rule: NonNullable<typeof rules>[number]) => {
    setEditing(rule.id);
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      condition: rule.condition as Condition,
      threshold: String(rule.threshold),
      targetType: (rule.targetType as typeof form.targetType) ?? undefined,
      targetId: rule.targetId ?? "",
      priority: rule.priority as Priority,
    });
    setOpen(true);
  };

  const showThreshold = form.condition === "balance_below" || form.condition === "revenue_target";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurar Alertas</h1>
          <p className="text-muted-foreground">
            Defina regras para receber notificações importantes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkAlerts.mutate()}
            disabled={checkAlerts.isPending}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", checkAlerts.isPending && "animate-spin")} />
            Verificar Agora
          </Button>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditing(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Regra" : "Nova Regra de Alerta"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Saldo Caixa Negativo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condição</Label>
                  <Select
                    value={form.condition}
                    onValueChange={(v) => setForm({ ...form, condition: v as Condition })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {showThreshold && (
                  <div className="space-y-2">
                    <Label>Limite (R$)</Label>
                    <Input
                      type="number"
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                )}
                {form.condition === "balance_below" && (
                  <div className="space-y-2">
                    <Label>Conta Bancária (opcional)</Label>
                    <Select
                      value={form.targetId || "all"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          targetId: v === "all" ? "" : v,
                          targetType: v === "all" ? undefined : "BANK_ACCOUNT",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as contas</SelectItem>
                        {bankAccounts?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as Priority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={onSubmit}
                  disabled={createRule.isPending || updateRule.isPending || !form.name}
                >
                  {editing ? "Salvar Alterações" : "Criar Regra"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Regras de Alerta
          </CardTitle>
          <CardDescription>{rules?.length ?? 0} regra(s) configurada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : rules?.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Bell className="mb-4 h-12 w-12 opacity-20" />
              <p>Nenhuma regra configurada</p>
              <p className="text-sm mt-1">Clique em "Nova Regra" para criar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules?.map((rule) => {
                const condition = CONDITIONS.find((c) => c.value === rule.condition);
                const priority = PRIORITIES.find((p) => p.value === rule.priority);
                return (
                  <div
                    key={rule.id}
                    className="group flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          priority?.color,
                        )}
                      >
                        {condition && <condition.icon className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {condition?.label}
                          {(rule.condition === "balance_below" ||
                            rule.condition === "revenue_target") &&
                            ` — R$ ${Number(rule.threshold).toFixed(2)}`}
                        </p>
                        <code className="text-xs text-muted-foreground bg-muted rounded px-1 py-0.5">
                          {rule.condition}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => onToggle(rule.id, rule.isActive)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm("Excluir esta regra?")) deleteRule.mutate({ id: rule.id });
                        }}
                        disabled={deleteRule.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
