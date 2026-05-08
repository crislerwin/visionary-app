"use client";

import { api } from "@/lib/trpc/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

// ── Field meta ──

const SYSTEM_FIELDS = [
  {
    key: "date" as const,
    label: "Data",
    description: "Data da transação (formato AAAA-MM-DD).",
    required: true,
  },
  {
    key: "description" as const,
    label: "Descrição",
    description: "Texto descritivo do lançamento.",
    required: true,
  },
  {
    key: "amount" as const,
    label: "Valor",
    description: "Valor monetário (positivo ou negativo).",
    required: true,
  },
  {
    key: "category" as const,
    label: "Categoria",
    description: "Classificação do lançamento.",
    required: false,
  },
] as const;

const IGNORE = "__ignore__";

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "AAAA-MM-DD (ISO)" },
  { value: "DD/MM/YYYY", label: "DD/MM/AAAA (Brasil)" },
  { value: "MM/DD/YYYY", label: "MM/DD/AAAA (EUA)" },
] as const;

// ── Helpers ──

const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Main ──

export function CsvTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const [mappingOpen, setMappingOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string | undefined>>({});
  const [dateFormat, setDateFormat] =
    useState<(typeof DATE_FORMATS)[number]["value"]>("YYYY-MM-DD");
  const [inferTypeFromSign] = useState(true);
  const [sourceName, setSourceName] = useState("");

  const { data: accounts } = api.bankAccount.list.useQuery();
  const [bankAccountId, setBankAccountId] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

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
        for (const fieldMeta of SYSTEM_FIELDS) {
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

  const handleImport = () => {
    const missing = SYSTEM_FIELDS.filter((f) => f.required && !columnMapping[f.key]);
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

  const hasRequired = columnMapping.date && columnMapping.description && columnMapping.amount;

  // ── Preview data + pagination ──

  interface PreviewRow {
    id: string;
    date: string;
    description: string;
    category: string | null;
    amount: string;
    type: "INCOME" | "EXPENSE";
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r).some((v) => v.toLowerCase().includes(q)));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  const previewRows = useMemo(() => {
    return current.map((r, i) => {
      const amt = Number(r[columnMapping.amount ?? ""] ?? 0);
      return {
        id: String(i),
        date: columnMapping.date ? (r[columnMapping.date] ?? "") : "",
        description: columnMapping.description ? (r[columnMapping.description] ?? "") : "",
        category: columnMapping.category ? (r[columnMapping.category] ?? null) : null,
        amount: r[columnMapping.amount ?? ""] ?? "0",
        type: amt < 0 ? ("INCOME" as const) : ("EXPENSE" as const),
      };
    });
  }, [current, columnMapping]);

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Importar planilha</CardTitle>
          <CardDescription>
            Envie um arquivo <span className="font-medium">.csv</span> contendo as colunas:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Data</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Descrição</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Valor</code>{" "}
            e <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Categoria</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-primary bg-accent/40"
                : "border-border hover:border-primary/50 hover:bg-accent/20"
            }`}
          >
            {loading ? (
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium text-foreground">
              {fileName ?? "Arraste e solte o arquivo aqui"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ou clique para selecionar (.csv, .txt)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {fileName ? `Arquivo selecionado: ${fileName}` : "Nenhum arquivo selecionado"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!rows.length}
                onClick={() => setMappingOpen(true)}
              >
                <Columns3 className="h-4 w-4" />
                Mapear Colunas
              </Button>
              <Button
                disabled={!hasRequired || !bankAccountId || !sourceName.trim() || loading}
                onClick={handleImport}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar transações"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={result.imported > 0 ? "border-green-500/30" : "border-destructive/30"}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-3">
              {result.imported > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {result.imported > 0 ? "Importação concluída" : "Falha na importação"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.imported > 0
                    ? `${result.imported} transações importadas`
                    : (result.errors[0] ?? "Erro desconhecido")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-green-50 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Importadas</p>
                <p className="text-lg font-bold text-green-700">{result.imported}</p>
              </div>
              <div className="flex-1 rounded-lg bg-amber-50 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Puladas</p>
                <p className="text-lg font-bold text-amber-700">{result.skipped}</p>
              </div>
              <div className="flex-1 rounded-lg bg-blue-50 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-blue-700">{result.total}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded border p-2 text-xs">
                {result.errors.map((err, i) => (
                  <li key={`err-${i}`} className="text-destructive">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Card */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Prévia dos dados</CardTitle>
              <CardDescription>Dados extraídos do arquivo enviado.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar por descrição, categoria, data..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Nenhum resultado encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.date}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.category ?? "—"}</Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            row.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {row.type === "INCOME" ? "+" : "−"}
                          {currency(Number(row.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} — {filtered.length} registros
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Dialog */}
      <ColumnMappingDialog
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        headers={headers}
        accounts={accounts ?? []}
        bankAccountId={bankAccountId}
        onBankAccountChange={setBankAccountId}
        dateFormat={dateFormat}
        onDateFormatChange={setDateFormat}
        sourceName={sourceName}
        onSourceNameChange={setSourceName}
        columnMapping={columnMapping}
        onColumnMappingChange={setColumnMapping}
        onConfirm={() => {
          setMappingOpen(false);
          handleImport();
        }}
      />
    </div>
  );
}

// ── Column Mapping Dialog (separate component, like sketch) ──

function ColumnMappingDialog({
  open,
  onOpenChange,
  headers,
  accounts,
  bankAccountId,
  onBankAccountChange,
  dateFormat,
  onDateFormatChange,
  sourceName,
  onSourceNameChange,
  columnMapping,
  onColumnMappingChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  headers: string[];
  accounts: { id: string; name: string }[];
  bankAccountId: string;
  onBankAccountChange: (v: string) => void;
  dateFormat: string;
  onDateFormatChange: (v: string) => void;
  sourceName: string;
  onSourceNameChange: (v: string) => void;
  columnMapping: Record<string, string | undefined>;
  onColumnMappingChange: (v: Record<string, string | undefined>) => void;
  onConfirm: () => void;
}) {
  const requiredMissing = SYSTEM_FIELDS.filter(
    (f) => f.required && (!columnMapping[f.key] || columnMapping[f.key] === IGNORE),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5" />
            Mapear colunas do CSV
          </DialogTitle>
          <DialogDescription>
            Associe cada coluna detectada no arquivo aos campos correspondentes do sistema. Campos
            marcados como obrigatórios precisam de um mapeamento válido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-12 gap-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div className="col-span-5">Campo do sistema</div>
            <div className="col-span-7">Coluna do arquivo</div>
          </div>

          {SYSTEM_FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-12 items-start gap-3 rounded-md border p-3">
              <div className="col-span-5 space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">{f.label}</Label>
                  {f.required && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      obrigatório
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <div className="col-span-7">
                <Select
                  value={columnMapping[f.key] || IGNORE}
                  onValueChange={(v) =>
                    onColumnMappingChange({
                      ...columnMapping,
                      [f.key]: v === IGNORE ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={IGNORE}>— Ignorar —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {requiredMissing.length > 0 && (
            <p className="text-xs text-destructive">
              Mapeie os campos obrigatórios: {requiredMissing.map((f) => f.label).join(", ")}.
            </p>
          )}

          {/* Config row */}
          <div className="grid gap-3 sm:grid-cols-3 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Formato de Data</Label>
              <Select value={dateFormat} onValueChange={onDateFormatChange}>
                <SelectTrigger>
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
            <div className="space-y-1">
              <Label className="text-xs font-medium">Conta Destino</Label>
              <Select value={bankAccountId} onValueChange={onBankAccountChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Nome da Fonte</Label>
              <Input
                value={sourceName}
                onChange={(e) => onSourceNameChange(e.target.value)}
                placeholder="Ex: Extrato Itaú"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={requiredMissing.length > 0} onClick={onConfirm}>
            Confirmar mapeamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
