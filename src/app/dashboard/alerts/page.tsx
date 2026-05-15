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
import { useTranslation } from "react-i18next";

type Condition = "balance_below" | "invoice_overdue" | "revenue_target";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export default function AlertsPage() {
  const { t } = useTranslation("common");
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
      console.info(t("alerts.ruleCreated"));
    },
    onError: (err) => console.error(err.message),
  });

  const updateRule = api.alert.updateRule.useMutation({
    onSuccess: () => {
      utils.alert.listRules.invalidate();
      setOpen(false);
      setEditing(null);
      resetForm();
      console.info(t("alerts.ruleUpdated"));
    },
    onError: (err) => console.error(err.message),
  });

  const deleteRule = api.alert.deleteRule.useMutation({
    onSuccess: () => {
      utils.alert.listRules.invalidate();
      console.info(t("alerts.ruleDeleted"));
    },
  });

  const checkAlerts = api.alert.check.useMutation({
    onSuccess: (res) => {
      if (res.created.length > 0) {
        console.info(`${res.created.length} ${t("alerts.alertsGenerated")}`);
        utils.alert.listNotifications.invalidate();
        utils.alert.unreadCount.invalidate();
      } else {
        console.info(t("alerts.noAlerts"));
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

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case "balance_below":
        return AlertTriangle;
      case "invoice_overdue":
        return Clock;
      case "revenue_target":
        return TrendingUp;
      default:
        return Bell;
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "balance_below":
        return t("alerts.balanceBelow");
      case "invoice_overdue":
        return t("alerts.invoiceOverdue");
      case "revenue_target":
        return t("alerts.revenueTarget");
      default:
        return condition;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-blue-100 text-blue-600";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-600";
      case "HIGH":
        return "bg-orange-100 text-orange-600";
      case "CRITICAL":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "LOW":
        return t("alerts.low");
      case "MEDIUM":
        return t("alerts.medium");
      case "HIGH":
        return t("alerts.high");
      case "CRITICAL":
        return t("alerts.critical");
      default:
        return priority;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight" suppressHydrationWarning>
            {t("alerts.title")}
          </h1>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {t("alerts.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkAlerts.mutate()}
            disabled={checkAlerts.isPending}
            suppressHydrationWarning
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", checkAlerts.isPending && "animate-spin")} />
            {t("alerts.checkNow")}
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
                <Plus className="mr-2 h-4 w-4" /> {t("alerts.newRule")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? t("alerts.editRule") : t("alerts.createRule")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t("alerts.ruleName")}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("alerts.ruleNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common:description")}</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t("alerts.descriptionOptional")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("alerts.condition")}</Label>
                  <Select
                    value={form.condition}
                    onValueChange={(v) => setForm({ ...form, condition: v as Condition })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balance_below">{t("alerts.balanceBelow")}</SelectItem>
                      <SelectItem value="invoice_overdue">{t("alerts.invoiceOverdue")}</SelectItem>
                      <SelectItem value="revenue_target">{t("alerts.revenueTarget")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showThreshold && (
                  <div className="space-y-2">
                    <Label>{t("alerts.threshold")}</Label>
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
                    <Label>{t("alerts.bankAccount")}</Label>
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
                        <SelectItem value="all">{t("alerts.allAccounts")}</SelectItem>
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
                  <Label>{t("alerts.priority")}</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as Priority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{t("alerts.low")}</SelectItem>
                      <SelectItem value="MEDIUM">{t("alerts.medium")}</SelectItem>
                      <SelectItem value="HIGH">{t("alerts.high")}</SelectItem>
                      <SelectItem value="CRITICAL">{t("alerts.critical")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={onSubmit}
                  disabled={createRule.isPending || updateRule.isPending || !form.name}
                >
                  {editing ? t("alerts.saveChanges") : t("alerts.createRule")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> {t("alerts.alertRules")}
          </CardTitle>
          <CardDescription>
            {rules?.length ?? 0} {t("alerts.rulesConfigured")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("loading")}</p>
          ) : rules?.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Bell className="mb-4 h-12 w-12 opacity-20" />
              <p>{t("alerts.noRules")}</p>
              <p className="text-sm mt-1">{t("alerts.createRuleHint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules?.map((rule) => {
                const ConditionIcon = getConditionIcon(rule.condition);
                const priorityColor = getPriorityColor(rule.priority);
                const _priorityLabel = getPriorityLabel(rule.priority);
                const conditionLabel = getConditionLabel(rule.condition);
                return (
                  <div
                    key={rule.id}
                    className="group flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          priorityColor,
                        )}
                      >
                        <ConditionIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? t("active") : t("inactive")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {conditionLabel}
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
                          if (confirm(t("alerts.deleteConfirm")))
                            deleteRule.mutate({ id: rule.id });
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
