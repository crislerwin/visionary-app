"use client";

import { cn } from "@/lib/utils";
import {
  Database,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabId = "connections" | "webhooks" | "csv" | "xlsx";

interface TabMeta {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
  placeholderLabel: string;
  placeholderAction: string;
}

const TABS: TabMeta[] = [
  {
    id: "connections",
    label: "Conexões Bancárias",
    icon: Link2,
    description: "Conecte suas contas bancárias via Open Finance para importar automaticamente.",
    placeholderLabel: "Nenhuma conexão bancária ativa.",
    placeholderAction: "Conectar banco",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: Database,
    description: "Receba transações via HTTP POST de gateways de pagamento, ERPs e outros sistemas.",
    placeholderLabel: "Nenhum webhook configurado.",
    placeholderAction: "Novo webhook",
  },
  {
    id: "csv",
    label: "CSV",
    icon: FileText,
    description: "Importe transações em lote a partir de arquivos CSV (.csv).",
    placeholderLabel: "Nenhum arquivo CSV importado.",
    placeholderAction: "Importar CSV",
  },
  {
    id: "xlsx",
    label: "XLSX",
    icon: FileSpreadsheet,
    description: "Importe transações em lote a partir de planilhas Excel (.xlsx).",
    placeholderLabel: "Nenhuma planilha XLSX importada.",
    placeholderAction: "Importar XLSX",
  },
];

export function DataSourcesClient() {
  const [tab, setTab] = useState<TabId>("connections");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fontes de Dados</h1>
        <p className="text-muted-foreground">
          Gerencie as origens dos seus dados financeiros — bancos, webhooks e arquivos.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <t.icon className="h-5 w-5" />
                  {t.label}
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Placeholder — cada tab será implementada em PRs separadas */}
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <t.icon className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="mb-2 text-sm text-muted-foreground">{t.placeholderLabel}</p>
                  <Button variant="outline" size="sm" disabled className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.placeholderAction}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
