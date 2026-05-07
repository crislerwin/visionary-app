"use client";

import { Database, FileSpreadsheet, FileText, Link2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PluggyConnectionsTab } from "./pluggy-connections-tab";

// Dynamic import — papaparse is browser-only
const CsvTab = dynamic(() => import("./csv-tab").then((m) => ({ default: m.CsvTab })), {
  ssr: false,
});

type TabId = "connections" | "webhooks" | "csv" | "xlsx";

interface TabMeta {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TAB_META: Record<TabId, TabMeta> = {
  connections: {
    id: "connections",
    label: "Conexões Bancárias",
    icon: Link2,
    description: "Conecte suas contas bancárias via Open Finance para importar automaticamente.",
  },
  webhooks: {
    id: "webhooks",
    label: "Webhooks",
    icon: Database,
    description: "Receba transações via HTTP POST de gateways, ERPs e outros sistemas.",
  },
  csv: {
    id: "csv",
    label: "CSV",
    icon: FileText,
    description: "Importe transações em lote a partir de arquivos CSV (.csv).",
  },
  xlsx: {
    id: "xlsx",
    label: "XLSX",
    icon: FileSpreadsheet,
    description: "Importe transações em lote a partir de planilhas Excel (.xlsx).",
  },
};

const PLACEHOLDER_TABS: TabId[] = ["webhooks", "xlsx"];

function PlaceholderPanel({ tabId }: { tabId: TabId }) {
  const meta = TAB_META[tabId];
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {meta.label}
        </CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Em breve.</p>
        </div>
      </CardContent>
    </Card>
  );
}

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
          {Object.entries(TAB_META).map(([key, meta]) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              <meta.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{meta.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Pluggy Connections Tab — real implementation */}
        <TabsContent value="connections">
          <PluggyConnectionsTab />
        </TabsContent>

        {/* CSV Tab — real implementation */}
        <TabsContent value="csv">
          <CsvTab />
        </TabsContent>

        {/* Placeholder tabs */}
        {PLACEHOLDER_TABS.map((id) => (
          <TabsContent key={id} value={id}>
            <PlaceholderPanel tabId={id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
