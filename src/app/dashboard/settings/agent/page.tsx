"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { AgentTone } from "@/types/agent";
import { WhatsAppStatus } from "@/types/evolution";
import {
  Bot,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Pencil,
  Power,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const TONE_LABELS: Record<string, string> = {
  FRIENDLY: "Amigável 😊",
  PROFESSIONAL: "Profissional 👔",
  CASUAL: "Casual 😎",
  FORMAL: "Formal 🎩",
};

const DEFAULT_SYSTEM = `Você é um atendente virtual de um restaurante.

Seu papel:
- Atender clientes no WhatsApp com simpatia, agilidade e tom acolhedor.
- Tirar dúvidas sobre o cardápio, horários e formas de pagamento.
- Ajudar o cliente a montar o pedido (entrega ou retirada).
- Confirmar endereço, taxa de entrega e tempo estimado.

Regras:
- Sempre confirme os itens antes de finalizar o pedido.
- Se não souber algo, ofereça transferir para um atendente humano.
- Nunca prometa descontos não autorizados.
- Use no máximo 2 emojis por mensagem.`;

const DEFAULT_WELCOME = `Olá! 👋 Sou o atendente virtual do restaurante.
Posso te ajudar a fazer um pedido, conferir o cardápio ou tirar dúvidas. Como posso te atender hoje?`;

export default function AgentSettingsPage() {
  const { toast } = useToast();
  const { currentTenant } = useCurrentTenant();
  const utils = api.useUtils();

  // ── Agent config ──
  const { data, isLoading } = api.agent.getConfig.useQuery(undefined, {
    enabled: !!currentTenant?.id,
  });

  const [agentName, setAgentName] = useState("Sofia");
  const [promptSystem, setPromptSystem] = useState(DEFAULT_SYSTEM);
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME);
  const [tone, setTone] = useState<AgentTone>(AgentTone.CASUAL);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [editingName, setEditingName] = useState(false);

  const createConfig = api.agent.createConfig.useMutation({
    onSuccess: () => {
      utils.agent.getConfig.invalidate();
      toast({
        title: "Configurações salvas",
        description: "O agente foi configurado com sucesso.",
      });
    },
    onError: (err) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const updateConfig = api.agent.updateConfig.useMutation({
    onSuccess: () => {
      utils.agent.getConfig.invalidate();
      toast({ title: "Configurações salvas", description: "O agente foi atualizado com sucesso." });
    },
    onError: (err) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (data?.config) {
      setAgentName(data.config.agentName ?? "Sofia");
      setPromptSystem(data.config.promptSystem ?? DEFAULT_SYSTEM);
      setWelcomeMessage(data.config.welcomeMessage ?? DEFAULT_WELCOME);
      setTone(data.config.tone as AgentTone);
      setAutoConfirm(data.config.autoConfirm ?? false);
      setIsActive(data.config.isActive ?? true);
    }
  }, [data]);

  // ── WhatsApp state ──
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>(WhatsAppStatus.DISCONNECTED);
  const [waPhone, setWaPhone] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
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
            headers: { "x-tenant-id": currentTenant?.id ?? "" },
          });
          if (!res.ok) return;
          const d = await res.json();
          if (!mountedRef.current) return;

          if (d.status === "CONNECTED") {
            setWaStatus(WhatsAppStatus.CONNECTED);
            setWaPhone(d.phoneNumber ?? "");
            setShowQR(false);
            stopPolling();
          } else if (d.status === "FAILED") {
            setWaStatus(WhatsAppStatus.FAILED);
            stopPolling();
          } else if (d.status === "DISCONNECTED") {
            setWaStatus(WhatsAppStatus.DISCONNECTED);
            stopPolling();
          }
        } catch {
          // ignore
        }
      }, 3000);
    },
    [currentTenant?.id, stopPolling],
  );

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch("/api/evolution/instances", {
        headers: { "x-tenant-id": currentTenant?.id ?? "" },
      });
      if (!res.ok) {
        setWaStatus(WhatsAppStatus.DISCONNECTED);
        return;
      }
      const d = await res.json();
      if (d.instances?.length > 0) {
        const inst = d.instances[0];
        setWaStatus(inst.status ?? WhatsAppStatus.DISCONNECTED);
        setWaPhone(inst.phoneNumber ?? "");
        if (inst.status === "CONNECTING") startPolling(inst.name);
      } else {
        setWaStatus(WhatsAppStatus.DISCONNECTED);
      }
    } catch {
      setWaStatus(WhatsAppStatus.DISCONNECTED);
    }
  }, [currentTenant?.id, startPolling]);

  useEffect(() => {
    if (currentTenant?.id) fetchInstance();
  }, [currentTenant?.id, fetchInstance]);

  const handleConnect = async () => {
    setWaLoading(true);
    try {
      const res = await fetch("/api/evolution/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": currentTenant?.id ?? "",
        },
        body: JSON.stringify({ name: `${currentTenant?.slug}-whatsapp` }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast({
          title: "Erro",
          description: d.error || "Falha ao criar instância",
          variant: "destructive",
        });
        return;
      }
      setWaStatus(WhatsAppStatus.CONNECTING);
      setShowQR(true);
      // Fetch QR
      const qrRes = await fetch(`/api/evolution/instances/${d.instance.name}/qrcode`, {
        headers: { "x-tenant-id": currentTenant?.id ?? "" },
      });
      const qrData = await qrRes.json();
      if (qrData.qrCode || qrData.base64) setQrCode(qrData.qrCode ?? qrData.base64);
      if (qrData.pairingCode) setPairingCode(qrData.pairingCode);
      startPolling(d.instance.name);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível conectar ao WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setWaLoading(true);
    try {
      const res = await fetch("/api/evolution/instances", {
        method: "DELETE",
        headers: { "x-tenant-id": currentTenant?.id ?? "" },
      });
      if (!res.ok) throw new Error();
      setWaStatus(WhatsAppStatus.DISCONNECTED);
      setQrCode(null);
      setPairingCode(null);
      setShowQR(false);
      stopPolling();
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao desconectar WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setWaLoading(false);
    }
  };

  const handleSave = () => {
    const payload = {
      promptSystem,
      welcomeMessage: welcomeMessage || null,
      tone,
      autoConfirm,
      isActive,
      agentName: agentName || "Sofia",
    };
    if (data?.config) {
      updateConfig.mutate(payload);
    } else {
      createConfig.mutate(payload);
    }
    setEditingName(false);
  };

  const isSaving = createConfig.isPending || updateConfig.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Configurações
            </p>
            <h1 className="text-lg font-semibold leading-none">Agente de IA</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-full gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-8">
        {/* Hero status card */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex flex-1 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingName(false);
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        autoFocus
                        className="h-8 w-48 text-lg font-semibold"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditingName(false)}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-semibold">{agentName || "Atendente"}</h2>
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                        aria-label="Editar nome"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "animate-pulse bg-emerald-500" : "bg-muted-foreground"
                      }`}
                    />
                    {isActive ? "Ativo" : "Pausado"}
                  </span>
                </div>
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                  Atendente virtual que conversa com seus clientes no WhatsApp, responde dúvidas e
                  registra pedidos automaticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
                <Power className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {isActive ? "Respondendo mensagens" : "Mensagens não serão respondidas"}
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-8 lg:col-span-2">
            {/* WhatsApp connection */}
            <SectionCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="Conexão com WhatsApp"
              description="Conecte o número que receberá as mensagens dos clientes."
            >
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      waStatus === WhatsAppStatus.CONNECTED
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "border border-border/60 bg-background text-muted-foreground"
                    }`}
                  >
                    {waStatus === WhatsAppStatus.CONNECTED ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : waStatus === WhatsAppStatus.CONNECTING ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Smartphone className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {waStatus === WhatsAppStatus.CONNECTED
                        ? "WhatsApp conectado"
                        : waStatus === WhatsAppStatus.CONNECTING
                          ? "Aguardando leitura do QR Code…"
                          : "Nenhum número conectado"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {waStatus === WhatsAppStatus.CONNECTED
                        ? waPhone || "Número conectado"
                        : "Conecte seu WhatsApp para começar"}
                    </p>
                  </div>
                  {waStatus === WhatsAppStatus.CONNECTED ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={waLoading}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-full gap-2"
                      onClick={handleConnect}
                      disabled={waLoading || waStatus === WhatsAppStatus.CONNECTING}
                    >
                      {waLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      Conectar
                    </Button>
                  )}
                </div>

                {showQR && (
                  <div className="overflow-hidden">
                    <Separator className="my-5" />
                    <div className="flex flex-col items-center gap-6 sm:flex-row">
                      <div className="relative h-44 w-44 shrink-0 rounded-2xl border border-border bg-white p-3 shadow-[var(--shadow-soft)]">
                        {qrCode ? (
                          <img
                            src={`data:image/png;base64,${qrCode}`}
                            alt="WhatsApp QR Code"
                            className="h-full w-full"
                          />
                        ) : (
                          <FakeQR />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                      <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                        <li>Abra o WhatsApp no seu celular</li>
                        <li>
                          Toque em <strong className="text-foreground">Mais opções</strong> →{" "}
                          <strong className="text-foreground">Aparelhos conectados</strong>
                        </li>
                        <li>Aponte a câmera para este código</li>
                        <li>Aguarde a confirmação automática</li>
                      </ol>
                    </div>
                    {pairingCode && (
                      <p className="mt-4 text-center text-sm text-muted-foreground">
                        Ou use o código de pareamento:{" "}
                        <code className="rounded bg-muted px-2 py-1 font-mono text-base font-bold">
                          {pairingCode}
                        </code>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Personalidade do agente */}
            <SectionCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Mensagem de boas-vindas"
              description="Primeira mensagem que o cliente recebe ao iniciar uma conversa."
            >
              <Textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={4}
                className="resize-none text-sm"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{welcomeMessage.length} caracteres</span>
                <button
                  type="button"
                  onClick={() => setWelcomeMessage(DEFAULT_WELCOME)}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" /> Restaurar padrão
                </button>
              </div>
            </SectionCard>

            {/* System instructions */}
            <SectionCard
              icon={<Wand2 className="h-5 w-5" />}
              title="Instruções do sistema"
              description="Defina a personalidade, regras e contexto do seu agente."
            >
              <Textarea
                value={promptSystem}
                onChange={(e) => setPromptSystem(e.target.value)}
                rows={12}
                className="resize-y font-mono text-xs leading-relaxed"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{promptSystem.length} caracteres</span>
                <button
                  type="button"
                  onClick={() => setPromptSystem(DEFAULT_SYSTEM)}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" /> Restaurar padrão
                </button>
              </div>
            </SectionCard>

            {/* Tom de voz – toggle buttons */}
            <SectionCard
              icon={<Zap className="h-5 w-5" />}
              title="Tom de Voz"
              description="Defina o estilo de comunicação do agente com os clientes."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(TONE_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTone(value as AgentTone)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      tone === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Behavior */}
            <SectionCard
              icon={<Zap className="h-5 w-5" />}
              title="Comportamento"
              description="Regras automáticas para o atendimento."
            >
              <ToggleRow
                title="Auto-confirmar pedidos"
                description="O agente confirma e envia pedidos direto para a cozinha sem aprovação manual."
                checked={autoConfirm}
                onChange={setAutoConfirm}
                badge={autoConfirm ? "Ativado" : undefined}
              />
              <Separator className="my-1" />
              <ToggleRow
                title="Transferir para humano em dúvidas"
                description="Sugere falar com um atendente quando o agente não tem certeza da resposta."
                checked={false}
                onChange={() => {}}
              />
              <Separator className="my-1" />
              <ToggleRow
                title="Responder fora do horário"
                description="Envia uma mensagem informando o horário de funcionamento."
                checked={false}
                onChange={() => {}}
              />
            </SectionCard>
          </div>

          {/* Right column — preview */}
          <aside className="space-y-6 self-start lg:sticky lg:top-24">
            <SectionCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="Pré-visualização"
              description="Como o cliente vê a conversa."
              compact
            >
              <div className="rounded-2xl bg-[#0b141a] p-3 shadow-inner">
                <div className="flex items-center gap-2 px-2 py-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{agentName || "Atendente"}</p>
                    <p className="text-[11px] text-white/60">online</p>
                  </div>
                </div>
                <div className="min-h-[260px] space-y-2 rounded-xl bg-[#0b141a] p-3">
                  <Bubble side="in">{welcomeMessage || "—"}</Bubble>
                  <Bubble side="out">Oi! Quero ver o cardápio 🍔</Bubble>
                  <Bubble side="in">
                    Claro! Você pode acessar nosso cardápio digital através do link que vou te
                    enviar!
                  </Bubble>
                </div>
              </div>
            </SectionCard>

            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Conexão segura
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Suas conversas e dados de clientes ficam criptografados. O sistema nunca acessa seu
                WhatsApp pessoal.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card shadow-[var(--shadow-soft)]">
      <header className={`flex items-start gap-3 ${compact ? "p-5 pb-3" : "p-6 pb-4"}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className={compact ? "px-5 pb-5" : "px-6 pb-6"}>{children}</div>
    </section>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{title}</p>
          {badge && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: React.ReactNode }) {
  const isIn = side === "in";
  return (
    <div className={`flex ${isIn ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-snug ${
          isIn
            ? "rounded-bl-sm bg-[#202c33] text-white/90"
            : "rounded-br-sm bg-[#005c4b] text-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function FakeQR() {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const x = i % 21;
    const y = Math.floor(i / 21);
    const corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const on = corner
      ? x === 0 ||
        y === 0 ||
        x === 6 ||
        y === 6 ||
        (x > 1 && x < 5 && y > 1 && y < 5) ||
        (x > 14 && x < 18 && y > 1 && y < 5) ||
        (x > 1 && x < 5 && y > 14 && y < 18)
      : (i * 7919) % 5 < 2;
    return on;
  });
  return (
    <div
      className="grid h-full w-full"
      style={{ gridTemplateColumns: "repeat(21, 1fr)", gridTemplateRows: "repeat(21, 1fr)" }}
    >
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-foreground" : "bg-transparent"} />
      ))}
    </div>
  );
}
