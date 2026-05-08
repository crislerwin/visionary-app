"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode, Smartphone, Wifi, WifiOff, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type WhatsAppStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "FAILED";

interface EvolutionInstance {
  id: string;
  name: string;
  status: WhatsAppStatus;
  phoneNumber?: string | null;
}

interface WhatsAppConfigProps {
  tenantId: string;
}

export function WhatsAppConfig({ tenantId }: WhatsAppConfigProps) {
  const [loading, setLoading] = useState(true);
  const [instanceName, setInstanceName] = useState("");
  const [instance, setInstance] = useState<EvolutionInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [fetchingQR, setFetchingQR] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  const startPolling = useCallback(
    (name: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/evolution/instances/${name}/status`, {
            headers: { "x-tenant-id": tenantId },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (!mountedRef.current) return;

          if (data.status === "CONNECTED") {
            setInstance((prev) =>
              prev
                ? {
                    ...prev,
                    status: "CONNECTED",
                    phoneNumber: data.phoneNumber || prev.phoneNumber,
                  }
                : null,
            );
            setQrCode(null);
            setPairingCode(null);
            stopPolling();
          } else if (data.status === "FAILED") {
            setError("Falha na conexão. Tente novamente.");
            stopPolling();
          } else if (data.status === "DISCONNECTED") {
            setInstance((prev) => (prev ? { ...prev, status: "DISCONNECTED" } : null));
            stopPolling();
          }
        } catch {
          // ignore polling errors
        }
      }, 3000);
    },
    [tenantId, stopPolling],
  );

  const handleCreate = async () => {
    const name = instanceName.trim();
    if (!name) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/evolution/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao criar instância");
        return;
      }

      setInstance(data.instance);
      setInstanceName("");

      await fetchQRCode(name);
    } catch {
      setError("Erro ao conectar com Evolution API. Verifique as credenciais.");
    } finally {
      setCreating(false);
    }
  };

  const fetchQRCode = async (name: string) => {
    setFetchingQR(true);
    setError(null);
    setQrCode(null);
    setPairingCode(null);
    try {
      const res = await fetch(`/api/evolution/instances/${name}/qrcode`, {
        headers: { "x-tenant-id": tenantId },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.details || "Falha ao obter QR code");
        return;
      }
      if (data.qrCode) setQrCode(data.qrCode);
      if (data.pairingCode) setPairingCode(data.pairingCode);
      setInstance((prev) => (prev ? { ...prev, status: "CONNECTING" } : null));
      startPolling(name);
    } catch {
      setError("Erro ao obter QR code");
    } finally {
      setFetchingQR(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/evolution/instances", {
        method: "DELETE",
        headers: { "x-tenant-id": tenantId },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Falha ao desconectar");
        return;
      }
      setInstance(null);
      setQrCode(null);
      setPairingCode(null);
      stopPolling();
    } catch {
      setError("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch("/api/evolution/instances", {
        headers: { "x-tenant-id": tenantId },
      });
      if (!res.ok) {
        setInstance(null);
        return;
      }
      const data = await res.json();
      if (data.instances?.length > 0) {
        const inst = data.instances[0];
        setInstance(inst);
        if (inst.status === "CONNECTING") {
          startPolling(inst.name);
        }
      } else {
        setInstance(null);
      }
    } catch {
      setInstance(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, startPolling]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          WhatsApp
        </CardTitle>
        <CardDescription>
          Conecte seu WhatsApp para receber e responder pedidos automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {!instance ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance-name">Nome da Instância</Label>
              <Input
                id="instance-name"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: meu-restaurante-whatsapp"
              />
              <p className="text-xs text-muted-foreground">
                Escolha um nome único para identificar sua conexão WhatsApp
              </p>
            </div>
            <Button onClick={handleCreate} disabled={creating || !instanceName.trim()}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              {instance.status === "CONNECTED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Wifi className="h-3.5 w-3.5" />
                  Conectado
                </span>
              ) : instance.status === "CONNECTING" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Conectando...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <WifiOff className="h-3.5 w-3.5" />
                  Desconectado
                </span>
              )}
              {instance.phoneNumber && (
                <span className="text-sm text-muted-foreground">{instance.phoneNumber}</span>
              )}
            </div>

            {instance.status === "CONNECTED" ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  WhatsApp conectado com sucesso! Pedidos enviados por aqui serão gerenciados
                  automaticamente.
                </div>
                <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Desconectando...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Desconectar WhatsApp
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {qrCode ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-xl border bg-white p-4">
                      <img
                        src={`data:image/png;base64,${qrCode}`}
                        alt="WhatsApp QR Code"
                        className="h-64 w-64"
                      />
                    </div>
                    {pairingCode && (
                      <p className="text-center text-sm text-muted-foreground">
                        Ou use o código de pareamento:{" "}
                        <code className="rounded bg-muted px-2 py-1 font-mono text-base font-bold">
                          {pairingCode}
                        </code>
                      </p>
                    )}
                    <p className="text-center text-sm text-muted-foreground">
                      Abra o WhatsApp no seu celular e escaneie o QR code para conectar
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Clique no botão abaixo para gerar o QR code de conexão
                    </p>
                    <Button onClick={() => fetchQRCode(instance.name)} disabled={fetchingQR}>
                      {fetchingQR ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-4 w-4" />
                          Obter QR Code
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {instance.status !== "CONNECTING" && (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    size="sm"
                  >
                    {disconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Desconectando...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelar
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
