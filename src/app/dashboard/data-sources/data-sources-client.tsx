"use client";

import { FileUp, Landmark, PenLine, Plus, Webhook } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BankAccountsTab } from "./bank-accounts-tab";
import { ImportFileModal } from "./import-file-modal";
import { PluggyConnectionsTab } from "./pluggy-connections-tab";

// Dynamic import — papaparse is browser-only
const CsvTab = dynamic(() => import("./csv-tab").then((m) => ({ default: m.CsvTab })), {
  ssr: false,
});

// Dynamic import — TransactionForm é pesado
const TransactionForm = dynamic(
  () =>
    import("@/components/transactions/TransactionForm").then((m) => ({
      default: m.TransactionForm,
    })),
  { ssr: false },
);

type TabId = "accounts" | "connections" | "csv" | "webhooks" | "xlsx";
type SourceOption = "file" | "pluggy" | "webhook" | "manual";

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
    icon: Landmark,
    description: "Conecte contas bancárias via Open Finance.",
  },
  csv: {
    id: "csv",
    label: "CSV",
    icon: FileUp,
    description: "Importe transações em lote a partir de CSV.",
  },
  webhooks: {
    id: "webhooks",
    label: "Webhooks",
    icon: Webhook,
    description: "Receba transações via HTTP POST.",
  },
  xlsx: {
    id: "xlsx",
    label: "XLSX",
    icon: FileUp,
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

// ── Option Card (ultra-compact, no Card wrapper) ──

interface OptionCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function OptionCard({ icon: Icon, title, subtitle, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <span className="text-[11px] leading-tight text-muted-foreground">{subtitle}</span>
    </button>
  );
}

export function DataSourcesClient() {
  const [tab, setTab] = useState<TabId>("accounts");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SourceOption | null>(null);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [importFileOpen, setImportFileOpen] = useState(false);

  const handleSelectOption = (option: SourceOption) => {
    setSelectedOption(option);
    setAddOpen(false);

    switch (option) {
      case "file":
        setImportFileOpen(true);
        break;
      case "pluggy":
        setTab("connections");
        break;
      case "webhook":
        setTab("webhooks");
        break;
      case "manual":
        setManualFormOpen(true);
        break;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header com botão + */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Fontes de Dados</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as origens dos seus dados financeiros — bancos, webhooks e arquivos.
          </p>
        </div>
        <Button size="sm" className="gap-1 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
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

      {/* ── Modal unificado de adicionar fonte ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="text-sm">Adicionar Fonte de Dados</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 p-4">
            <OptionCard
              icon={FileUp}
              title="Arquivo"
              subtitle="PDF · CSV"
              onClick={() => handleSelectOption("file")}
            />
            <OptionCard
              icon={Landmark}
              title="Conectar Banco"
              subtitle="Open Finance"
              onClick={() => handleSelectOption("pluggy")}
            />
            <OptionCard
              icon={Webhook}
              title="Webhook"
              subtitle="Endpoint HTTP"
              onClick={() => handleSelectOption("webhook")}
            />
            <OptionCard
              icon={PenLine}
              title="Lançamento Manual"
              subtitle="Valor · Data · Categoria"
              onClick={() => handleSelectOption("manual")}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sub-modais ── */}

      <ImportFileModal
        open={importFileOpen}
        onOpenChange={setImportFileOpen}
        onSuccess={() => {
          setImportFileOpen(false);
          setTab("accounts");
        }}
      />

      <TransactionForm
        open={manualFormOpen}
        onOpenChange={setManualFormOpen}
        onSuccess={() => {
          setManualFormOpen(false);
          // Não muda tab — usuário permanece onde está
        }}
      />
    </div>
  );
}
