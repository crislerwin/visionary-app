/** Issue #53 — Finance Processor HTTP Client
 *
 * Cliente para o microserviço finance-processor (Python/pdfplumber).
 * Extrai transações de PDF/CSV bancários e retorna JSON normalizado.
 *
 * @see https://github.com/crislerwin/finance-processor
 */

const PROCESSOR_URL = process.env.NEXT_PUBLIC_FINANCE_PROCESSOR_URL ?? "http://localhost:8000";

export interface ExtractedTransaction {
  date: string; // ISO 8601, "2024-01-15"
  description: string;
  amount: number; // Decimal format (0.01 para centavos)
  category?: string;
  bank?: string;
  transaction_type?: "income" | "expense" | "transfer";
  raw_data?: string;
}

export interface ExtractFileResponse {
  transactions: ExtractedTransaction[];
  bankDetected: string | null;
  totalProcessed: number;
  errors?: string[];
}

export interface ExtractFileOptions {
  bankHint?: string; // "itau", "nubank", "inter", etc.
  tableId?: string; // NocoDB table_id para rastreamento
}

export interface FinanceProcessorError {
  message: string;
  code: string;
  details?: unknown;
}

/**
 * Envia um arquivo (PDF ou CSV) para o microserviço finance-processor
 * e retorna as transações extraídas.
 *
 * Usage:
 *   const result = await extractTransactions(file, { bankHint: 'itau' });
 *   console.log(result.transactions); // Array de transações normalizadas
 */
export async function extractTransactions(
  file: File,
  options: ExtractFileOptions = {},
): Promise<ExtractFileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (options.bankHint) formData.append("bank", options.bankHint);
  if (options.tableId) formData.append("table_id", options.tableId);

  const res = await fetch(`${PROCESSOR_URL}/api/v1/extract`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[FinanceProcessor] Extract failed:", errorBody);
    throw new Error(`Falha na extração: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ExtractFileResponse;
  return data;
}

/**
 * Health check do microserviço.
 *
 * Usage:
 *   const healthy = await checkHealth();
 *   if (!healthy) console.error("Finance processor offline.");
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PROCESSOR_URL}/api/v1/health`, { method: "GET" });
    if (!res.ok) return false;
    const data = (await res.json()) as { status: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Verifica se o microserviço está disponível antes de tentar upload.
 *
 * Se offline, retorna um erro amigável em vez de falhar silenciosamente.
 */
export async function ensureAvailable(): Promise<void> {
  const healthy = await checkHealth();
  if (!healthy) {
    throw new Error(
      "O serviço de extração de arquivos não está disponível. " +
        "Verifique se o container 'finance-processor' está rodando."
    );
  }
}
