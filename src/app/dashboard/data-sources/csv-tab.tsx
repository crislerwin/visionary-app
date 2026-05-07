"use client";

import { api } from "@/lib/trpc/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  Loader2,
  Plus,
  Search,
  Table2,
} from "lucide-react";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type { TransactionStatus, TransactionType } from "@prisma/client";

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
  {
    key: "date",
    label: "Data",
    required: true,
    description: "Data da transação (DD/MM/AAAA, AAAA-MM-DD, etc.)",
  },
  {
    key: "description",
    label: "Descrição",
    required: true,
    description: "Texto descritivo do lançamento.",
  },
  {
    key: "amount",
    label: "Valor",
    required: true,
    description: "Valor monetário (positivo ou negativo).",
  },
  {
    key: "type",
    label: "Tipo",
    required: false,
    description: "Entrada/Saída. Se ausente, infere pelo sinal.",
  },
  {
    key: "category",
    label: "Categoria",
    required: false,
    description: "Classificação do lançamento.",
  },
  {
    key: "status",
    label: "Status",
    required: false,
    description: "completed, pending ou cancelled.",
  },
] as const;

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "AAAA-MM-DD (ISO)" },
  { value: "DD/MM/YYYY", label: "DD/MM/AAAA (Brasil)" },
  { value: "MM/DD/YYYY", label: "MM/DD/AAAA (EUA)" },
] as const;

// ── Helpers ──

const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const IGNORE = "__ignore__";

// ── Main ──

export function CsvTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Mapping state
  const [mappingOpen, setMappingOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string | undefined>>({});
  const [dateFormat, setDateFormat] = useState<typeof DATE_FORMATS[number]["value"]>("YYYY-MM-DD");
  const [inferTypeFromSign] = useState(true);
  const [sourceName, setSourceName] = useState("");

  const { data: accounts } = api.bankAccount.list.useQuery();
  const [bankAccountId, setBankAccountId] = useState("");

  // Preview state
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

  const _mappedCount = Object.values(columnMapping).filter(Boolean).length;
  const hasRequired = columnMapping.date && columnMapping.description && columnMapping.amount;

  // ── Preview data ──

  interface PreviewRow {
    id: string;
    date: string;
    description: string;
    category: string | null;
    amount: string;
    type: TransactionType;
    status: TransactionStatus;
  }

  const previewRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? rows.filter((r) => Object.values(r).some((v) => v.toLowerCase().includes(q)))
      : rows;
    return filtered.map((r, i) => {
      const amt = Number(r[columnMapping.amount ?? ""] ?? 0);
      const mappedType = columnMapping.type ? (r[columnMapping.type]?.toLowerCase() ?? "") : "";
      return {
        id: String(i),
        date: columnMapping.date ? (r[columnMapping.date] ?? "") : "",
        description: columnMapping.description ? (r[columnMapping.description] ?? "") : "",
        category: columnMapping.category ? (r[columnMapping.category] ?? null) : null,
        amount: r[columnMapping.amount ?? ""] ?? "0",
        type: (() => {
          if (mappedType.includes("entrada") || mappedType.includes("income"))
            return "INCOME" as TransactionType;
          if (mappedType.includes("saida") || mappedType.includes("expense"))
            return "EXPENSE" as TransactionType;
          return amt < 0 ? ("INCOME" as TransactionType) : ("EXPENSE" as TransactionType);
        })(),
        status: (() => {
          if (columnMapping.status) {
            const v = r[columnMapping.status]?.toLowerCase() ?? "";
            if (v.includes("pendente") || v.includes("pending"))
              return "PENDING" as TransactionStatus;
            if (v.includes("cancelado") || v.includes("cancelled"))
              return "CANCELLED" as TransactionStatus;
          }
          return "COMPLETED" as TransactionStatus;
        })(),
      } as PreviewRow;
    });
  }, [rows, columnMapping, search]);

  const totalPages = Math.max(1, Math.ceil(previewRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = previewRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Upload Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
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
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors",
                dragOver
                  ? "border-primary bg-accent/40"
                  : "border-border hover:border-primary/50 hover:bg-accent/20",
              )}
            >
              <FileText className="mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">
                {fileName ?? "Arraste um .csv aqui ou clique para selecionar"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </button>

            {/* Buttons */}
            <div className="flex flex-col gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={!rows.length}
                onClick={() => setMappingOpen(true)}
                className="h-8 text-xs"
              >
                <Columns3 className="mr-1 h-3.5 w-3.5" />
                Mapear Colunas
              </Button>
              <Button
                size="sm"
                disabled={!hasRequired || !bankAccountId || !sourceName.trim() || loading}
                onClick={handleImport}
                className="h-8 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-3.5 w-3.5" />
                )}
                Importar {rows.length} transações
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={cn(result.imported > 0 ? "border-green-500/30" : "border-destructive/30")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
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
                    ? `${result.imported} transações importadas com sucesso`
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
                  <li key={i} className="text-destructive">
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
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Prévia dos dados</span>
                <Badge variant="outline" className="text-[10px]">
                  {previewRows.length} linhas · {headers.length} colunas
                </Badge>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 pl-7 text-xs"
                />
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum resultado encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.date}</TableCell>
                        <TableCell className="text-sm">{row.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.category ?? "—"}</Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            row.type === "INCOME" ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {row.type === "INCOME" ? "+" : "−"}
                          {currency(Number(row.amount))}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                              row.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : row.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700",
                            )}
                          >
                            {row.status === "COMPLETED"
                              ? "Concluído"
                              : row.status === "PENDING"
                                ? "Pendente"
                                : "Cancelado"}
                          </span>
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
                Página {currentPage} de {totalPages} — {previewRows.length} registros
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Dialog */}
      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5" />
              Mapear colunas do CSV
            </DialogTitle>
            <DialogDescription>
              Associe cada coluna detectada no arquivo aos campos do sistema. Campos marcados como
              obrigatórios precisam de um mapeamento válido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {/* Headers */}
            <div className="grid grid-cols-12 gap-3 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <div className="col-span-5">Campo</div>
              <div className="col-span-7">Coluna do arquivo</div>
            </div>

            {FIELD_META.map((f) => (
              <div
                key={f.key}
                className="grid grid-cols-12 items-start gap-3 rounded-md border p-2"
              >
                <div className="col-span-5 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-medium">{f.label}</Label>
                    {f.required && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        *
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{f.description}</p>
                </div>
                <div className="col-span-7">
                  <Select
                    value={columnMapping[f.key] || IGNORE}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [f.key]: v === IGNORE ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione..." />
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

            {/* Config row inside dialog */}
            <div className="grid gap-2 sm:grid-cols-3 rounded-md border p-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-medium">Formato de Data</Label>
                <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as typeof DATE_FORMATS[number]["value"])}>
                  <SelectTrigger className="h-7 text-xs">
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
                <Label className="text-[10px] font-medium">Conta Destino</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-medium">Nome da Fonte</Label>
                <Input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Ex: Extrato Itaú"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!hasRequired || !bankAccountId || !sourceName.trim()}
              onClick={() => {
                setMappingOpen(false);
                handleImport();
              }}
            >
              Confirmar e Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
