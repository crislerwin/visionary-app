"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { OrderStatus, type PaymentMethod } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  CheckCircle,
  ChefHat,
  Clock,
  Eye,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Truck,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderAddress, OrderWithItemsAndTenant } from "./types";
import { useOrderMutations } from "./use-order-mutations";

const orderStatusConfig: Record<
  OrderStatus,
  {
    label: string;
    icon: typeof Clock;
    color: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  [OrderStatus.PENDING]: {
    label: "Pendente",
    icon: Clock,
    color: "text-yellow-500",
    variant: "outline",
  },
  [OrderStatus.CONFIRMED]: {
    label: "Confirmado",
    icon: CheckCircle,
    color: "text-blue-500",
    variant: "secondary",
  },
  [OrderStatus.PREPARING]: {
    label: "Em Preparo",
    icon: ChefHat,
    color: "text-orange-500",
    variant: "default",
  },
  [OrderStatus.READY]: {
    label: "Pronto",
    icon: Package,
    color: "text-green-500",
    variant: "default",
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    label: "Saiu para Entrega",
    icon: Truck,
    color: "text-blue-600",
    variant: "secondary",
  },
  [OrderStatus.DELIVERED]: {
    label: "Entregue",
    icon: Home,
    color: "text-green-600",
    variant: "outline",
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelado",
    icon: Ban,
    color: "text-red-500",
    variant: "destructive",
  },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  CASH: "Dinheiro",
  OTHERS: "Outros",
};

const statusActionLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Confirmar Pagamento",
  [OrderStatus.CONFIRMED]: "Iniciar Preparo",
  [OrderStatus.PREPARING]: "Marcar como Pronto",
  [OrderStatus.READY]: "Entregar / Enviar",
  [OrderStatus.OUT_FOR_DELIVERY]: "Marcar Entregue",
  [OrderStatus.DELIVERED]: "—",
  [OrderStatus.CANCELLED]: "—",
};

export default function OrdersPage() {
  const { toast } = useToast();
  const { currentTenant } = useCurrentTenant();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const [detailOrder, setDetailOrder] = useState<OrderWithItemsAndTenant | null>(null);

  const tenantId = currentTenant?.id ?? "";
  const listInput = { tenantId, status: statusFilter === "ALL" ? undefined : statusFilter };

  const {
    data: ordersRaw,
    isLoading,
    refetch,
  } = api.order.list.useQuery(listInput, {
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  // Notificação sonora para novos pedidos pendentes
  const lastPendingCount = useRef(0);
  useEffect(() => {
    const pendingOrders = (ordersRaw ?? []).filter((o) => o.status === OrderStatus.PENDING);
    if (pendingOrders.length > lastPendingCount.current && lastPendingCount.current > 0) {
      // Toca beep com Web Audio API (não depende de arquivo externo)
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch {
        // Ignora erro de áudio
      }
    }
    lastPendingCount.current = pendingOrders.length;
  }, [ordersRaw]);

  const orders = (ordersRaw ?? []) as unknown as OrderWithItemsAndTenant[];

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
    if (customerSearch.trim()) {
      const search = customerSearch.toLowerCase();
      const customerName = order.customer?.name?.toLowerCase() ?? "";
      const customerPhone = order.customer?.phone?.toLowerCase() ?? "";
      const orderId = order.id.toLowerCase();
      if (
        !customerName.includes(search) &&
        !customerPhone.includes(search) &&
        !orderId.includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const { handleNextStatus, handleCancel, isUpdating, isCancelling } = useOrderMutations({
    tenantId,
    refetch,
    toast,
  });

  const handleWhatsApp = useCallback((_orderId: string, phone: string | null | undefined) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}`;
    window.open(url, "_blank");
  }, []);

  const pendingCount = filteredOrders?.filter((o) => o.status === OrderStatus.PENDING).length ?? 0;

  const columns = useMemo<ColumnDef<OrderWithItemsAndTenant>[]>(
    () => [
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const order = row.original;
          const cfg = orderStatusConfig[order.status];
          const Icon = cfg.icon;
          return (
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${cfg.color}`} />
              <Badge variant={cfg.variant} className="text-xs">
                {cfg.label}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "id",
        header: "Pedido",
        cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id.slice(-6)}</span>,
      },
      {
        id: "customer",
        header: "Cliente",
        cell: ({ row }) => {
          const c = row.original.customer;
          return (
            <div className="text-sm">
              <div className="font-medium">{c?.name || "—"}</div>
              <div className="text-muted-foreground text-xs">{c?.phone || "—"}</div>
            </div>
          );
        },
      },
      {
        id: "items",
        header: "Itens",
        cell: ({ row }) => {
          const items = row.original.items;
          const summary = items
            .slice(0, 2)
            .map((i) => `${i.quantity}x ${i.productName}`)
            .join(", ");
          return (
            <div className="text-sm max-w-[200px] truncate" title={summary}>
              {summary}
              {items.length > 2 ? ` +${items.length - 2}` : ""}
            </div>
          );
        },
      },
      {
        id: "payment",
        header: "Pagamento",
        cell: ({ row }) => (
          <span className="text-sm">{paymentMethodLabels[row.original.paymentMethod]}</span>
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-semibold text-sm">R$ {Number(row.original.total).toFixed(2)}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Data",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const order = row.original;
          const nextAction = statusActionLabels[order.status];
          const canCancel =
            order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;

          return (
            <div className="flex items-center gap-1 flex-wrap">
              {nextAction !== "—" && (
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextStatus(order.id, order.status, order.type);
                  }}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {nextAction}
                </Button>
              )}

              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel(order.id);
                  }}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Ban className="h-3 w-3 mr-1" />
                  )}
                  Cancelar
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailOrder(order);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                Detalhes
              </Button>

              {order.tenant?.whatsappPhone && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWhatsApp(order.id, order.tenant?.whatsappPhone);
                  }}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleNextStatus, handleCancel, isUpdating, isCancelling, handleWhatsApp],
  );

  const order = detailOrder;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Pedidos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {pendingCount > 0
                ? `${pendingCount} pedido(s) pendente(s)`
                : "Nenhum pedido pendente"}
            </p>
          </div>
        </div>

        {!isLoading && !tenantId && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Selecione um estabelecimento para ver os pedidos
            </p>
          </div>
        )}

        {tenantId && (
          <DataTable
            columns={columns}
            data={filteredOrders}
            totalItems={filteredOrders.length}
            pageSize={filteredOrders.length || 10}
            currentPage={1}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            isLoading={isLoading}
            toolbarLeft={
              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as OrderStatus | "ALL")}
                >
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    {Object.values(OrderStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {orderStatusConfig[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Buscar por cliente, telefone ou ID..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="max-w-[260px] h-9 text-sm"
                />
              </div>
            }
          />
        )}
      </div>

      {/* Modal de Detalhes do Pedido */}
      <Dialog open={!!order} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {order &&
            (() => {
              const addr = order.address as OrderAddress | null;
              return (
                <>
                  <DialogHeader className="px-6 pt-6 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <DialogTitle className="text-xl">Pedido #{order.id.slice(-6)}</DialogTitle>
                        <DialogDescription>
                          {new Date(order.createdAt).toLocaleString("pt-BR")}
                        </DialogDescription>
                      </div>
                      <Badge variant={orderStatusConfig[order.status].variant} className="text-sm">
                        {orderStatusConfig[order.status].label}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="px-6 py-2 space-y-6">
                    {/* Dados do Cliente */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Dados do Cliente
                      </h3>
                      <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Nome:</span>
                          <span className="font-medium">{order.customer?.name || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{order.customer?.phone || "—"}</span>
                        </div>
                        {order.customer?.email && (
                          <div className="text-muted-foreground text-xs">
                            {order.customer.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Endereço */}
                    {addr && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Endereço de Entrega
                        </h3>
                        <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                          <p className="font-medium">
                            {addr.street}, {addr.number}
                          </p>
                          {addr.complement && (
                            <p className="text-muted-foreground">{addr.complement}</p>
                          )}
                          <p className="text-muted-foreground">
                            {addr.neighborhood}, {addr.city} - {addr.state}
                          </p>
                          <p className="text-muted-foreground text-xs">CEP: {addr.zipCode}</p>
                          {addr.reference && (
                            <p className="text-muted-foreground text-xs">Ref: {addr.reference}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Itens do Pedido */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Itens do Pedido</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">Produto</th>
                              <th className="text-center px-3 py-2 font-medium">Qtd</th>
                              <th className="text-right px-3 py-2 font-medium">Unitário</th>
                              <th className="text-right px-3 py-2 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr key={item.id} className="border-t">
                                <td className="px-3 py-2">
                                  <div className="font-medium">{item.productName}</div>
                                  {item.notes && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">
                                  R$ {Number(item.unitPrice).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  R$ {Number(item.totalPrice).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Observações */}
                    {order.customerNotes && (
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Observações</h3>
                        <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                          {order.customerNotes}
                        </p>
                      </div>
                    )}

                    {/* Resumo Financeiro */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Resumo</h3>
                      <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>R$ {Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        {order.deliveryFee ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxa de Entrega</span>
                            <span>R$ {Number(order.deliveryFee).toFixed(2)}</span>
                          </div>
                        ) : null}
                        {order.discount ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Desconto</span>
                            <span className="text-green-600">
                              - R$ {Number(order.discount).toFixed(2)}
                            </span>
                          </div>
                        ) : null}
                        <Separator />
                        <div className="flex justify-between font-semibold text-base">
                          <span>Total</span>
                          <span>R$ {Number(order.total).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground pt-1">
                          <span>Forma de Pagamento</span>
                          <span>{paymentMethodLabels[order.paymentMethod]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer com Ações */}
                  <div className="px-6 py-4 border-t bg-background flex flex-wrap gap-2">
                    {statusActionLabels[order.status] !== "—" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          handleNextStatus(order.id, order.status, order.type);
                          setDetailOrder(null);
                        }}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        {statusActionLabels[order.status]}
                      </Button>
                    )}

                    {(order.status === OrderStatus.PENDING ||
                      order.status === OrderStatus.CONFIRMED) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleCancel(order.id);
                          setDetailOrder(null);
                        }}
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Ban className="h-4 w-4 mr-1" />
                        )}
                        Cancelar Pedido
                      </Button>
                    )}

                    {order.tenant?.whatsappPhone && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleWhatsApp(order.id, order.tenant?.whatsappPhone)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
