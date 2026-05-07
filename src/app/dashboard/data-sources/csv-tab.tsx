"use client";

import { api } from "@/lib/trpc/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Search,
  Table2,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──

type CsvRow = Record<string, string>;

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}

// ── System fields to map ──

const FIELD_META = [
  {
    key: "date",
    label: "Data",
    required: true,
    description: "Formato: DD/MM/AAAA, AAAA-MM-DD, ou MM/DD/AAAA",
  },
  { key: "description", label: "Descrição", required: true, description: "Nome da transação" },
  {
    key: "amount",
    label: "Valor",
    required: true,
    description: "Valor da transação (ex: 1.234,56)",
  },
  {
    key: "type",
    label: "Tipo (opcional)",
    required: false,
    description: "Entrada/Saída. Se ausente, infere pelo sinal",
  },
  {
    key: "category",
    label: "Categoria (opcional)",
    required: false,
    description: "Categoria da transação",
  },
  {
    key: "status",
    label: "Status (opcional)",
    required: false,
    description: "completed, pending ou cancelled",
  },
] as const;

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "AAAA-MM-DD (ISO)" },
  { value: "DD/MM/YYYY", label: "DD/MM/AAAA (Brasil)" },
  { value: "MM/DD/YYYY", label: "MM/DD/AAAA (EUA)" },
] as const;

const COLORS = [
  "bg-blue-100 dark:bg-blue-900/50",
  "bg-green-100 dark:bg-green-900/50",
  "bg-purple-100 dark:bg-purple-900/50",
  "bg-amber-100 dark:bg-amber-900/50",
  "bg-rose-100 dark:bg-rose-900/50",
  "bg-cyan-100 dark:bg-cyan-900/50",
];

// ── Currency formatter (BR) ──

const _fmoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Main component ──

export function CsvTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [inferTypeFromSign, _setInferTypeFromSign] = useState(true);
  const [sourceName, setSourceName] = useState("");

  // Preview state
  const [search, setSearch] = useState("");

  // Bank account selection
  const { data: accounts } = api.bankAccount.list.useQuery();
  const [bankAccountId, setBankAccountId] = useState("");

  // Import mutation
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

  // ── File handling ──

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

        // Auto-map if column names match
        const auto: Record<string, string> = {};
        for (const fieldMeta of FIELD_META) {
          const match = hdrs.find((h) => h.toLowerCase().includes(fieldMeta.key.toLowerCase()));
          if (match) auto[fieldMeta.key] = match;
        }
        setColumnMapping(auto);
        setSourceName(file.name.replace(/\.(csv|txt)$/i, ""));

        // Auto-select first bank account
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
    if (!files || files.length === 0) return;
    parseFile(files[0]);
  };

  // ── Preview filtering ──

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r).some((v) => v.toLowerCase().includes(q)));
  }, [rows, search]);

  const previewRows = filtered.slice(0, 50);

  // ── Import handler ──

  const handleImport = () => {
    // Validate required mappings
    const missing = FIELD_META.filter((f) => f.required && !columnMapping[f.key]);
    if (missing.length > 0) {
      setResult({
        imported: 0,
        skipped: 0,
        total: rows.length,
        errors: [`Required columns not mapped: ${missing.map((m) => m.label).join(", ")}`],
      });
      return;
    }

    if (!bankAccountId) {
      setResult({ imported: 0, skipped: 0, total: rows.length, errors: ["Select a bank account"] });
      return;
    }

    if (!sourceName.trim()) {
      setResult({ imported: 0, skipped: 0, total: rows.length, errors: ["Enter a source name"] });
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

  const hasRequiredMappings =
    columnMapping.date && columnMapping.description && columnMapping.amount;

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar arquivo CSV
          </CardTitle>
          <CardDescription>
            Faça upload de um arquivo{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.csv</code> com dados de
            transações financeiras. Delimitadores suportados: vírgula, ponto-e-vírgula, tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
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
            className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-primary bg-accent/40"
                : "border-border hover:border-primary/50 hover:bg-accent/20"
            }`}
          >
            <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName ?? "Arraste e solte o arquivo CSV aqui"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ou clique para selecionar (.csv — até 20MB)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </button>
        </CardContent>
      </Card>

      {/* Column Mapping Card — só aparece quando arquivo foi carregado */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Mapeamento de Colunas
            </CardTitle>
            <CardDescription>
              Indique qual coluna do seu arquivo corresponde a cada campo do sistema. Campos
              marcados com <span className="text-destructive">*</span> são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FIELD_META.map((field, idx) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={columnMapping[field.key] ?? ""}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: v || undefined }))
                    }
                  >
                    <SelectTrigger className={`h-8 text-xs ${COLORS[idx % COLORS.length]}`}>
                      <SelectValue placeholder={`Coluna de ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {!field.required && (
                        <SelectItem value="__none__">{`Não mapear ${field.label}`}</SelectItem>
                      )}
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

            {/* Config section */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Formato de Data</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Banco / Conta Destino</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome da Fonte</Label>
                <Input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Ex: Extrato Itaú Maio/2026"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {Object.values(columnMapping).filter(Boolean).length} de {FIELD_META.length} campos
                mapeados
              </p>
              <Button
                onClick={handleImport}
                disabled={!hasRequiredMappings || !bankAccountId || !sourceName.trim() || loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Importar {rows.length} transações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Card */}
      {result && (
        <Card className={result.imported > 0 ? "border-green-500/50" : "border-destructive/50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.imported > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Resultado da Importação
            </CardTitle>
            <CardDescription>
              {result.imported > 0
                ? `${result.imported} transações importadas com sucesso`
                : "Falha na importação"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                <p className="text-xs text-muted-foreground">Importadas</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {result.imported}
                </p>
              </div>
              <div className="flex-1 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-xs text-muted-foreground">Puladas</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {result.skipped}
                </p>
              </div>
              <div className="flex-1 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {result.total}
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  {result.errors.length} erro(s)
                </summary>
                <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto rounded border p-2 text-xs">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-destructive">
                      {err}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Table Card */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Pré-visualização
              </CardTitle>
              <CardDescription>
                {rows.length} linhas detectadas · {headers.length} colunas · primeiras 50 linhas
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap text-xs">
                        {h}
                        {Object.values(columnMapping).includes(h) && (
                          <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
                            {FIELD_META.find((f) => columnMapping[f.key] === h)?.label}
                          </Badge>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={headers.length || 1}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum resultado encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((h) => (
                          <TableCell key={h} className="whitespace-nowrap text-xs">
                            {row[h] ?? ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
