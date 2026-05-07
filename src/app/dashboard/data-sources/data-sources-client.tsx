"use client";

import { Database, FileSpreadsheet, FileText, Landmark, Link2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BankAccountsTab } from "./bank-accounts-tab";
import { PluggyConnectionsTab } from "./pluggy-connections-tab";

// Dynamic import — papaparse is browser-only
const CsvTab = dynamic(() => import("./csv-tab").then((m) => ({ default: m.CsvTab })), {
  ssr: false,
});

type TabId = "accounts" | "connections" | "csv" | "webhooks" | "xlsx";

interface TabMeta {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TAB_META: Record<TabId, TabMeta> = {
  accounts: {
    id: "accounts",
    label: "Contas",
    icon: Landmark,
    description: "Visualize contas importadas e suas transações.",
  },
  connections: {
    id: "connections",
    label: "Conexões",
    icon: Link2,
    description: "Conecte contas bancárias via Open Finance.",
  },
  csv: {
    id: "csv",
    label: "CSV",
    icon: FileText,
    description: "Importe transações em lote a partir de CSV.",
  },
  webhooks: {
    id: "webhooks",
    label: "Webhooks",
    icon: Database,
    description: "Receba transações via HTTP POST.",
  },
  xlsx: {
    id: "xlsx",
    label: "XLSX",
    icon: FileSpreadsheet,
    description: "Importe transações via planilhas Excel.",
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
  const [tab, setTab] = useState<TabId>("accounts");

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

        <TabsContent value="accounts">
          <BankAccountsTab />
        </TabsContent>

        <TabsContent value="connections">
          <PluggyConnectionsTab />
        </TabsContent>

        <TabsContent value="csv">
          <CsvTab />
        </TabsContent>

        {PLACEHOLDER_TABS.map((id) => (
          <TabsContent key={id} value={id}>
            <PlaceholderPanel tabId={id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
