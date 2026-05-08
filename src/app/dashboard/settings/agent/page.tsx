"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { useToast } from "@/hooks/use-toast";
import { hasRole } from "@/lib/permissions";
import { api } from "@/lib/trpc/react";
import { AgentTone } from "@/types/agent";
import { Loader2, Lock, Save } from "lucide-react";
import { useEffect, useState } from "react";

const TONE_LABELS: Record<string, string> = {
  FRIENDLY: "Amigável 😊",
  PROFESSIONAL: "Profissional 👔",
  CASUAL: "Casual 😎",
  FORMAL: "Formal 🎩",
};

export default function AgentSettingsPage() {
  const { toast } = useToast();
  const { currentTenant, currentRole, isLoading: isLoadingTenant } = useCurrentTenant();
  const utils = api.useUtils();

  const canManage = hasRole(currentRole, "ADMIN");

  const { data, isLoading } = api.agent.getConfig.useQuery(undefined, {
    enabled: !!currentTenant?.id,
  });

  const isLoadingData = isLoadingTenant || isLoading;

  const createConfig = api.agent.createConfig.useMutation({
    onSuccess: () => {
      utils.agent.getConfig.invalidate();
      toast({
        title: "Configurações salvas",
        description: "O agente foi configurado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfig = api.agent.updateConfig.useMutation({
    onSuccess: () => {
      utils.agent.getConfig.invalidate();
      toast({ title: "Configurações salvas", description: "O agente foi atualizado com sucesso." });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [promptSystem, setPromptSystem] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [tone, setTone] = useState<AgentTone>(AgentTone.CASUAL);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (data?.config) {
      setPromptSystem(data.config.promptSystem);
      setWelcomeMessage(data.config.welcomeMessage ?? "");
      setTone(data.config.tone as AgentTone);
      setAutoConfirm(data.config.autoConfirm);
      setIsActive(data.config.isActive);
    }
  }, [data]);

  const handleSave = () => {
    if (data?.config) {
      updateConfig.mutate({
        promptSystem,
        welcomeMessage: welcomeMessage || null,
        tone,
        autoConfirm,
        isActive,
      });
    } else {
      createConfig.mutate({
        promptSystem,
        welcomeMessage: welcomeMessage || null,
        tone,
        autoConfirm,
      });
    }
  };

  const isSaving = createConfig.isPending || updateConfig.isPending;

  if (isLoadingData) {
    return (
      <PageContainer>
        <PageHeader title="Agente" description="Configure o atendente virtual do seu restaurante" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (!canManage) {
    return (
      <PageContainer>
        <PageHeader title="Agente" description="Configure o atendente virtual do seu restaurante" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Acesso restrito</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              Apenas administradores podem configurar o agente. Entre em contato com o dono do
              restaurante.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Agente"
        description="Configure o atendente virtual do seu restaurante"
        action={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personalidade do Agente</CardTitle>
            <CardDescription>
              Defina como o agente deve se comportar ao atender os clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt-system">Instruções do Sistema</Label>
              <Textarea
                id="prompt-system"
                value={promptSystem}
                onChange={(e) => setPromptSystem(e.target.value)}
                placeholder="Ex: Você é o atendente da Pizzaria Central. Seja prestativo e rápido. Sempre confirme o endereço de entrega."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Estas instruções guiam o comportamento do agente. Seja específico sobre como ele
                deve atender.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-message">Mensagem de Boas-vindas</Label>
              <Textarea
                id="welcome-message"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Ex: Olá! Bem-vindo à Pizzaria Central! 🍕 Em que posso ajudar?"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Mensagem enviada quando um cliente inicia a conversa pela primeira vez.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tom de Voz</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as AgentTone)}>
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Selecione o tom de voz" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TONE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define o estilo de comunicação do agente com os clientes.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comportamento</CardTitle>
              <CardDescription>Controle como o agente processa os pedidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-confirm">Auto-confirmar Pedidos</Label>
                  <p className="text-sm text-muted-foreground">
                    Confirma pedidos automaticamente sem intervenção humana
                  </p>
                </div>
                <Switch id="auto-confirm" checked={autoConfirm} onCheckedChange={setAutoConfirm} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active">Agente Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Desative para pausar o atendimento automático
                  </p>
                </div>
                <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
              <CardDescription>Dicas para configurar seu agente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                O agente utiliza inteligência artificial para atender seus clientes via WhatsApp.
                Ele pode:
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Apresentar o cardápio e responder sobre produtos</li>
                <li>Receber pedidos e criar no sistema automaticamente</li>
                <li>Consultar status de pedidos anteriores</li>
                <li>Responder no tom de voz configurado</li>
              </ul>
              <p>
                Para funcionar, conecte o WhatsApp na aba <strong>WhatsApp</strong> nas
                configurações de Marca.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
