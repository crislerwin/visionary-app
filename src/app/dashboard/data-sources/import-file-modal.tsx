"use client";

import { api } from "@/lib/trpc/react";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

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

// Aliases de bancos conhecidos para auto-detect
const BANK_ALIASES: Record<string, string[]> = {
  nubank: ["nubank", "nu_", "nu "],
  inter: ["inter", "banco_inter", "bancointer"],
  itau: ["itau", "itaú", "extrato_itau", "itaucard"],
  picpay: ["picpay", "pic_pay"],
  bradesco: ["bradesco", "bradescard"],
  santander: ["santander"],
  banco_do_brasil: ["bb", "banco_do_brasil", "bancodobrasil"],
  caixa: ["caixa", "cef", "caixa_economica"],
  citi: ["citi", "citibank"],
  hsbc: ["hsbc"],
};

function detectBank(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const [bank, aliases] of Object.entries(BANK_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) return bank;
  }
  return null;
}

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  bank?: string;
  transaction_type?: "income" | "expense" | "transfer";
  raw_data?: string;
}

interface ImportFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportFileModal({ open, onOpenChange, onSuccess }: ImportFileModalProps) {
  const { t } = useTranslation("common");
  const [file, setFile] = useState<File | null>(null);
  const [detectedBank, setDetectedBank] = useState<string | null>(null);
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCount, setExtractedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: bankAccounts } = api.bankAccount.list.useQuery();

  const bulkCreateMutation = api.transaction.bulkCreateFromExtract.useMutation({
    onSuccess: () => {
      utils.bankAccount.list.invalidate();
      utils.transaction.list.invalidate();
      setIsProcessing(false);
      setExtractedCount(null);
      setFile(null);
      setBankAccountId("");
      onSuccess?.();
    },
    onError: (err) => {
      setIsProcessing(false);
      console.error("Erro ao importar transações:", err);
      setError(err.message);
    },
  });

  // Auto-detect bank when file is selected
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setExtractedCount(null);

    if (selected) {
      const bank = detectBank(selected.name);
      setDetectedBank(bank);
      console.log(`[ImportFile] Detected bank: ${bank ?? "unknown"} from "${selected.name}"`);
    } else {
      setDetectedBank(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped && (dropped.name.endsWith(".pdf") || dropped.name.endsWith(".csv"))) {
      setFile(dropped);
      setError(null);
      setExtractedCount(null);
      const bank = detectBank(dropped.name);
      setDetectedBank(bank);
      console.log(`[ImportFile] Detected bank: ${bank ?? "unknown"} from "${dropped.name}"`);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // ── Processing simulation (will be replaced by real finance-processor call) ──
  const handleProcess = useCallback(async () => {
    if (!file || !bankAccountId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Replace with real finance-processor HTTP call
      // For now, simulate extraction with a timeout
      console.log(`[ImportFile] Processing ${file.name} for account ${bankAccountId}`);

      // Mock extracted transactions (will be replaced by actual API response)
      const mockTransactions: ExtractedTransaction[] = await simulateExtraction(file, detectedBank);

      if (mockTransactions.length === 0) {
        setError(t("dataSources.importFile.noTransactions"));
        setIsProcessing(false);
        return;
      }

      setExtractedCount(mockTransactions.length);

      // Call tRPC bulkCreateFromExtract
      await bulkCreateMutation.mutateAsync({
        bankAccountId,
        transactions: mockTransactions,
        skipDuplicates: true,
      });
    } catch (err) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      console.error("[ImportFile] Process error:", err);
    }
  }, [file, bankAccountId, detectedBank, bulkCreateMutation, t]);

  const clearFile = useCallback(() => {
    setFile(null);
    setDetectedBank(null);
    setExtractedCount(null);
    setError(null);
  }, []);

  const canProcess = file && bankAccountId && !isProcessing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("dataSources.importFile.title")}</DialogTitle>
          <DialogDescription className="text-[11px]">
            {t("dataSources.importFile.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* File Drop Zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-6 text-center transition-colors hover:bg-muted/40"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-[11px] text-muted-foreground">
                  {t("dataSources.importFile.dropHint")}
                </p>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-[11px] font-medium text-primary hover:underline">
                    {t("dataSources.importFile.browse")}
                  </span>
                </label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.csv"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border p-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearFile}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Detected bank hint */}
          {detectedBank && (
            <p className="text-[11px] text-muted-foreground">
              {t("dataSources.importFile.detectedBank")}{" "}
              <span className="font-medium capitalize text-foreground">
                {detectedBank.replace(/_/g, " ")}
              </span>
            </p>
          )}

          {/* Bank Account Select */}
          <div className="space-y-1">
            <Label className="text-[12px]">{t("dataSources.importFile.destinationAccount")}</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger className="text-[12px] h-8">
                <SelectValue placeholder={t("dataSources.importFile.selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id} className="text-[12px]">
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && <p className="text-[11px] text-red-500">{error}</p>}

          {/* Extracted count */}
          {extractedCount !== null && !isProcessing && !bulkCreateMutation.isPending && (
            <p className="text-[11px] text-green-600">
              {t("dataSources.importFile.importSuccess", { count: extractedCount })}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs h-7"
              onClick={handleProcess}
              disabled={!canProcess}
            >
              {isProcessing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {isProcessing
                ? t("dataSources.importFile.processing")
                : t("dataSources.importFile.import")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Mock extraction (will be replaced by finance-processor HTTP call) ──

async function simulateExtraction(
  file: File,
  bankHint: string | null,
): Promise<ExtractedTransaction[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // In real implementation, this will POST the file to finance-processor:
  // const formData = new FormData();
  // formData.append('file', file);
  // if (bankHint) formData.append('bank', bankHint);
  // const res = await fetch(`${PROCESSOR_URL}/extract`, { method: 'POST', body: formData });
  // const data = await res.json();
  // return data.transactions;

  // For now, return empty to force "backend not connected" flow
  console.log(`[ImportFile] Mock extraction for ${file.name} (bank: ${bankHint ?? "unknown"})`);

  // TODO: Remove mock — integrate with finance-processor microservice
  return [];
}
