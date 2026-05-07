"use client";

import { Database, FileSpreadsheet, FileText, Landmark, Link2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

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

  return (
    <div className="flex flex-col items-center justify-center rounded-md border py-8 text-center">
      <meta.icon className="mb-2 h-6 w-6 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">Em breve.</p>
    </div>
  );
}

export function DataSourcesClient() {
  const [tab, setTab] = useState<TabId>("accounts");

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Fontes de Dados</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as origens dos seus dados financeiros — bancos, webhooks e arquivos.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList className="h-8">
          {Object.entries(TAB_META).map(([key, meta]) => (
            <TabsTrigger key={key} value={key} className="gap-1 text-xs">
              <meta.icon className="h-3 w-3" />
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
