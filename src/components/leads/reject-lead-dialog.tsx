"use client";

import { api } from "@/lib/trpc/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectLeadDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

export function RejectLeadDialog({ open, onClose, leadId }: RejectLeadDialogProps) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const reject = api.lead.reject.useMutation({
    onError: (err) => setError(err.message),
    onSuccess: () => onClose(),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    reject.mutate({ leadId, reason });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar lead</DialogTitle>
          <DialogDescription>Informe o motivo da rejeição</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Não atende aos critérios..."
              required
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={reject.isPending || !reason}>
              {reject.isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Rejeitar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
