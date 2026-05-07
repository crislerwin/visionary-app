"use client";

import { api } from "@/lib/trpc/react";
import type { OrderStatus, OrderType } from "@prisma/client";

interface UseOrderMutationsOptions {
  tenantId: string;
  refetch: () => Promise<unknown>;
  toast: (_opts: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
}

export function useOrderMutations({ tenantId, refetch, toast }: UseOrderMutationsOptions) {
  const updateStatusMutation = api.order.updateStatus.useMutation({
    onSuccess: () => {
      toast({ title: "Status atualizado com sucesso!" });
      void refetch();
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = api.order.cancel.useMutation({
    onSuccess: () => {
      toast({ title: "Pedido cancelado" });
      void refetch();
    },
    onError: (error: { message: string }) => {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    },
  });

  const handleNextStatus = (orderId: string, currentStatus: OrderStatus, orderType: OrderType) => {
    const nextStatusMap: Record<OrderStatus, OrderStatus | null> = {
      PENDING: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY",
      READY: orderType === "DELIVERY" ? "OUT_FOR_DELIVERY" : "DELIVERED",
      OUT_FOR_DELIVERY: "DELIVERED",
      DELIVERED: null,
      CANCELLED: null,
    };
    const nextStatus = nextStatusMap[currentStatus];
    if (nextStatus) {
      updateStatusMutation.mutate({ id: orderId, tenantId, status: nextStatus });
    }
  };

  const handleCancel = (orderId: string) => {
    cancelMutation.mutate({ id: orderId, tenantId });
  };

  return {
    updateStatusMutation,
    cancelMutation,
    handleNextStatus,
    handleCancel,
    isUpdating: updateStatusMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
