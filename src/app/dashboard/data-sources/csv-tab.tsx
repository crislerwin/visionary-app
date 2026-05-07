"use client";

import { api } from "@/lib/trpc/react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Plus, Table2 } from "lucide-react";
import Papa from "papaparse";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

// ── Types ──

type CsvRow = Record<string, string>;

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}

// ── Field meta ──

const FIELD_META = [
  { key: "date", label: "Data", required: true },
  { key: "description", label: "Descrição", required: true },
  { key: "amount", label: "Valor", required: true },
  { key: "type", label: "Tipo", required: false },
  { key: "category", label: "Categoria", required: false },
  { key: "status", label: "Status", required: false },
] as const;

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "AAAA-MM-DD" },
  { value: "DD/MM/YYYY", label: "DD/MM/AAAA" },
  { value: "MM/DD/YYYY", label: "MM/DD/AAAA" },
] as const;

const COLORS = [
  "bg-blue-100",
  "bg-green-100",
  "bg-purple-100",
  "bg-amber-100",
  "bg-rose-100",
  "bg-cyan-100",
];

// ── Preview columns ──

function makePreviewColumns(headers: string[]): ColumnDef<CsvRow>[] {
  return headers.map((h) => ({
    accessorKey: h,
    header: h,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs">{(row.getValue(h) as string) ?? ""}</span>
    ),
  }));
}

// ── Main ──

export function CsvTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [inferTypeFromSign] = useState(true);
  const [sourceName, setSourceName] = useState("");

  const { data: accounts } = api.bankAccount.list.useQuery();
  const [bankAccountId, setBankAccountId] = useState("");

  const csvImport = api.dataSource.csvImport.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setLoading(false);
    },
    onError: (err) => {
      setResult({ imported: 0, skipped: 0, total: rows.length, errors: [err.message] });
      setLoading(false);
    },
  });

  // ── Parse ──

  const parseFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const hdrs = results.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(results.data as CsvRow[]);

        const auto: Record<string, string> = {};
        for (const fieldMeta of FIELD_META) {
          const match = hdrs.find((h) => h.toLowerCase().includes(fieldMeta.key.toLowerCase()));
          if (match) auto[fieldMeta.key] = match;
        }
        setColumnMapping(auto);
        setSourceName(file.name.replace(/\.\w+$/i, ""));

        if (accounts?.length && !bankAccountId) {
          setBankAccountId(accounts[0].id);
        }
        setLoading(false);
      },
      error: (err) => {
        setResult({ imported: 0, skipped: 0, total: 0, errors: [err.message] });
        setLoading(false);
      },
    });
  };

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    parseFile(files[0]);
  };

  // ── Import ──

  const handleImport = () => {
    const missing = FIELD_META.filter((f) => f.required && !columnMapping[f.key]);
    if (missing.length) {
      setResult({
        imported: 0,
        skipped: 0,
        total: rows.length,
        errors: [`Colunas obrigatórias: ${missing.map((m) => m.label).join(", ")}`],
      });
      return;
    }
    if (!bankAccountId) {
      setResult({ imported: 0, skipped: 0, total: rows.length, errors: ["Selecione uma conta"] });
      return;
    }
    if (!sourceName.trim()) {
      setResult({
        imported: 0,
        skipped: 0,
        total: rows.length,
        errors: ["Informe o nome da fonte"],
      });
      return;
    }

    setLoading(true);
    csvImport.mutate({
      sourceName: sourceName.trim(),
      bankAccountId,
      columnMapping: {
        date: columnMapping.date!,
        description: columnMapping.description!,
        amount: columnMapping.amount!,
        type: columnMapping.type,
        category: columnMapping.category,
        status: columnMapping.status,
      },
      rows,
      dateFormat,
      inferTypeFromSign,
    });
  };

  const mappedCount = Object.values(columnMapping).filter(Boolean).length;
  const hasRequired = columnMapping.date && columnMapping.description && columnMapping.amount;

  // ── Render ──

  return (
    <div className="space-y-3">
      {/* Upload */}
      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 transition-colors",
          dragOver
            ? "border-primary bg-accent/40"
            : "border-border hover:border-primary/50 hover:bg-accent/20",
        )}
      >
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-medium">{fileName ?? "Arraste CSV ou clique"}</p>
          <p className="text-[11px] text-muted-foreground">
            .csv, .txt · até 20MB · vírgula, ponto-e-vírgula, tab
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </button>

      {/* Column Mapping */}
      {rows.length > 0 && (
        <div className="space-y-3 rounded-md border p-3">
          {/* Selects */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FIELD_META.map((field, idx) => (
              <div key={field.key} className="space-y-0.5">
                <Label className="text-[11px] font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={columnMapping[field.key] ?? ""}
                  onValueChange={(v) =>
                    setColumnMapping((prev) => ({ ...prev, [field.key]: v || undefined }))
                  }
                >
                  <SelectTrigger className={cn("h-7 text-[11px]", COLORS[idx % COLORS.length])}>
                    <SelectValue placeholder={`Coluna ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {!field.required && <SelectItem value="__none__">Não mapear</SelectItem>}
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Config row */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-medium">Formato de Data</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[11px] font-medium">Conta Destino</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue placeholder="Conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>{" "}
            <div className="space-y-0.5">
              <Label className="text-[11px] font-medium">Nome da Fonte</Label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="h-7 text-[11px]"
                placeholder="Ex: Extrato Itaú Maio/2026"
              />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-muted-foreground">
              {mappedCount}/{FIELD_META.length} campos · {rows.length} linhas
            </p>
            <Button
              onClick={handleImport}
              disabled={!hasRequired || !bankAccountId || !sourceName.trim() || loading}
              size="sm"
              className="h-7 gap-1 text-xs"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Importar
            </Button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={cn(
            "space-y-2 rounded-md border p-3",
            result.imported > 0 ? "border-green-500/30" : "border-destructive/30",
          )}
        >
          <div className="flex items-center gap-2">
            {result.imported > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">
              {result.imported > 0 ? `${result.imported} importadas` : "Falha"}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded bg-green-50 p-2">
              <p className="text-[10px] text-muted-foreground">OK</p>
              <p className="text-lg font-bold text-green-700">{result.imported}</p>
            </div>
            <div className="flex-1 rounded bg-amber-50 p-2">
              <p className="text-[10px] text-muted-foreground">Puladas</p>
              <p className="text-lg font-bold text-amber-700">{result.skipped}</p>
            </div>
            <div className="flex-1 rounded bg-blue-50 p-2">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-blue-700">{result.total}</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded border border-destructive/20 bg-destructive/5 p-2">
              <p className="text-[11px] text-destructive">{result.errors[0]}</p>
            </div>
          )}
        </div>
      )}

      {/* Preview DataTable */}
      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Preview</span>
              <Badge variant="secondary" className="text-[10px]">
                {rows.length} linhas · {headers.length} colunas
              </Badge>
            </div>
          </div>
          <DataTable
            columns={makePreviewColumns(headers)}
            data={rows.slice(0, 50)}
            searchKey={headers[0]}
            searchPlaceholder="Filtrar..."
          />
        </div>
      )}
    </div>
  );
}
