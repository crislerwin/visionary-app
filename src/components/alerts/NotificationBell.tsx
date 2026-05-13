"use client";

import { useState } from "react";
import { Bell, Check, X, AlertTriangle, Info, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const { data: notifications } = api.alert.listNotifications.useQuery({
    status: "UNREAD",
    limit: 10,
  });

  const { data: unreadCount } = api.alert.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const markAsRead = api.alert.markAsRead.useMutation({
    onSuccess: () => {
      utils.alert.listNotifications.invalidate();
      utils.alert.unreadCount.invalidate();
    },
  });

  const markAllAsRead = api.alert.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.alert.listNotifications.invalidate();
      utils.alert.unreadCount.invalidate();
    },
  });

  const items = notifications ?? [];
  const count = unreadCount ?? 0;

  const getIcon = (title: string) => {
    if (title.includes("Saldo Baixo") || title.includes("contas")) {
      return AlertTriangle;
    }
    if (title.includes("vencida") || title.includes("vencido")) {
      return Clock;
    }
    return Info;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-in zoom-in">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notificações</h4>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">Nenhuma notificação</p>
              <Link
                href="/dashboard/alerts"
                className="text-xs text-primary hover:underline mt-2"
                onClick={() => setOpen(false)}
              >
                Configurar alertas →
              </Link>
            </div>
          ) : (
            items.map((n) => {
              const Icon = getIcon(n.title);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 border-b px-4 py-3 hover:bg-muted/50 transition-colors",
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 text-yellow-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => markAsRead.mutate({ id: n.id })}
                    disabled={markAsRead.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </ScrollArea>
        {items.length > 0 && (
          <div className="border-t px-4 py-2">
            <Link
              href="/dashboard/notifications"
              className="text-xs text-center block text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver todas as notificações →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
