"use client";

import { Banknote, Link2, Loader2, RefreshCw, Trash2, Unlink } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/trpc/react";

const PluggyConnectWidget = dynamic(() => import("@/components/pluggy/pluggy-connect-widget"), {
  ssr: false,
});

export function PluggyConnectionsTab() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: tokenData, isLoading: tokenLoading } = api.pluggy.createConnectToken.useQuery(
    undefined,
    { enabled: open },
  );

  const {
    data: connections,
    isLoading: connectionsLoading,
    refetch,
  } = api.pluggy.listConnections.useQuery();

  const saveConnection = api.pluggy.saveConnection.useMutation({
    onSuccess: () => {
      refetch();
      setOpen(false);
    },
  });

  const deleteConnection = api.pluggy.deleteConnection.useMutation({
    onSuccess: () => refetch(),
  });

  const syncConnection = api.pluggy.syncConnection.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSuccess = (data: {
    item: { id: string; connector: { id: number; name: string } | null };
  }) => {
    saveConnection.mutate({
      itemId: data.item.id,
      connectorId: data.item.connector?.id ?? 0,
      connectorName: data.item.connector?.name ?? "Unknown",
    });
  };

  const handleError = (err: { message: string }) => {
    setError(err.message);
  };

  const isLoading = connectionsLoading || tokenLoading;

  return (
    <div className="space-y-6">
      {/* Pluggy Connect Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Conectar Banco
          </CardTitle>
          <CardDescription>
            Conecte suas contas bancárias via Pluggy Open Finance para importar transações
            automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              setOpen(true);
              setError(null);
            }}
            className="gap-2"
          >
            <Banknote className="h-4 w-4" />
            Conectar nova conta
          </Button>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {!process.env.NEXT_PUBLIC_PLUGGY_CONFIGURED && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Credenciais do Pluggy não configuradas. Adicione PLUGGY_CLIENT_ID e
              PLUGGY_CLIENT_SECRET no arquivo .env para habilitar a integração.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Connected Institutions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlink className="h-5 w-5" />
            Instituições Conectadas
          </CardTitle>
          <CardDescription>Gerencie as conexões ativas e sincronize transações.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando conexões...
            </div>
          ) : !connections?.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma instituição conectada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{conn.connectorName}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {conn.status} · {new Date(conn.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => syncConnection.mutate({ id: conn.id })}
                      disabled={syncConnection.isPending}
                      title="Sincronizar"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${syncConnection.isPending ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteConnection.mutate({ id: conn.id })}
                      disabled={deleteConnection.isPending}
                      className="text-destructive hover:text-destructive"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pluggy Connect Widget overlay */}
      {open && tokenLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Iniciando conexão segura...
          </div>
        </div>
      )}

      {open && tokenData?.connectToken && (
        <PluggyConnectWidget
          connectToken={tokenData.connectToken}
          includeSandbox
          onSuccess={handleSuccess}
          onError={handleError}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
