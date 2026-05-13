"use client";

import {
  Banknote,
  Building2,
  Check,
  CreditCard,
  Landmark,
  Link2,
  Loader2,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  accountName: string;
  onConnected?: () => void;
}

const BANKS = [
  { id: "nubank", name: "Nubank", icon: CreditCard, color: "#8A05BE" },
  { id: "itau", name: "Itaú", icon: Building2, color: "#EC7000" },
  { id: "bradesco", name: "Bradesco", icon: Landmark, color: "#CC092F" },
  { id: "santander", name: "Santander", icon: Building2, color: "#EC0000" },
  { id: "bb", name: "Banco do Brasil", icon: Banknote, color: "#F8E71C" },
  { id: "inter", name: "Banco Inter", icon: Wallet, color: "#FF7A00" },
  { id: "c6", name: "C6 Bank", icon: CreditCard, color: "#242424" },
  { id: "picpay", name: "PicPay", icon: Wallet, color: "#11C76F" },
] as const;

type Step = "list" | "connecting" | "done";

export function ConnectBankModal({ accountName, onConnected }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("list");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const handleOpen = () => {
    setOpen(true);
    setStep("list");
    setSelectedBank(null);
  };

  const handleSelect = (bankId: string) => {
    setSelectedBank(bankId);
    setStep("connecting");

    // Simula conexão após 2s (placeholder — backend real virá depois)
    setTimeout(() => setStep("done"), 2000);
  };

  const handleDone = () => {
    onConnected?.();
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    setStep("list");
  };

  return (
    <>
      {/* Trigger button */}
      <Button variant="outline" size="sm" className="gap-2" onClick={handleOpen}>
        <Link2 className="h-4 w-4" /> Conectar Banco
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Conectar {accountName}
            </DialogTitle>
            <DialogDescription>
              {step === "list" && "Selecione seu banco para conectar via Open Finance."}
              {step === "connecting" && "Conectando à instituição financeira..."}
              {step === "done" &&
                "Conexão simulada com sucesso! O backend será integrado em breve."}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Bank list */}
          {step === "list" && (
            <div className="grid grid-cols-2 gap-2 py-2">
              {BANKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b.id)}
                  className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${b.color}20` }}
                  >
                    <b.icon className="h-4 w-4" style={{ color: b.color }} />
                  </div>
                  <span className="text-sm font-medium">{b.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Connecting placeholder */}
          {step === "connecting" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Conectando ao {BANKS.find((b) => b.id === selectedBank)?.name ?? "banco"}...
              </p>
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Tudo pronto!</p>
                <p className="text-sm text-muted-foreground">
                  Conexão com {BANKS.find((b) => b.id === selectedBank)?.name ?? "banco"} simulada.
                </p>
              </div>
              <Button onClick={handleDone} className="min-w-[200px]">
                Continuar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
