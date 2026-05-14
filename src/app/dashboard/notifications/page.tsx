"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { AlertTriangle, Bell, Check, Clock, Info, Trash2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function NotificationsPage() {
  const { t, i18n } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("unread");
  const utils = api.useUtils();

  const { data: notifications, isLoading } = api.alert.listNotifications.useQuery({
    status: activeTab === "unread" ? "UNREAD" : activeTab === "read" ? "READ" : undefined,
    limit: 50,
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

  const dismiss = api.alert.dismiss.useMutation({
    onSuccess: () => {
      utils.alert.listNotifications.invalidate();
      utils.alert.unreadCount.invalidate();
    },
  });

  const dateLocale = i18n.language === "en" ? enUS : ptBR;

  const getIcon = (condition: string) => {
    switch (condition) {
      case "balance_below":
        return AlertTriangle;
      case "invoice_overdue":
        return Clock;
      case "revenue_target":
        return TrendingUp;
      default:
        return Info;
    }
  };

  const getBadge = (condition: string) => {
    switch (condition) {
      case "balance_below":
        return <Badge variant="destructive">{t("notifications.lowBalance")}</Badge>;
      case "invoice_overdue":
        return <Badge variant="secondary">{t("notifications.overdue")}</Badge>;
      case "revenue_target":
        return <Badge variant="outline">{t("notifications.target")}</Badge>;
      default:
        return <Badge>{t("notifications.alert")}</Badge>;
    }
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "unread":
        return t("notifications.unread");
      case "read":
        return t("notifications.read");
      case "all":
        return t("notifications.all");
      default:
        return tab;
    }
  };

  const getEmptyMessage = (tab: string) => {
    switch (tab) {
      case "unread":
        return t("notifications.noUnread");
      case "read":
        return t("notifications.noRead");
      default:
        return t("notifications.noNotifications");
    }
  };

  const items = notifications ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("notifications.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("notifications.description")}</p>
        </div>
        {items.some((n) => n.status === "UNREAD") && (
          <Button onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
            <Check className="mr-2 h-4 w-4" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="unread">{t("notifications.unread")}</TabsTrigger>
          <TabsTrigger value="read">{t("notifications.read")}</TabsTrigger>
          <TabsTrigger value="all">{t("notifications.all")}</TabsTrigger>
        </TabsList>

        {["unread", "read", "all"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-primary" />
                  {getTabTitle(tab)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">{t("loading")}</p>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Bell className="mb-4 h-12 w-12 opacity-20" />
                    <p>{getEmptyMessage(tab)}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((n) => {
                      const Icon = getIcon(n.alertRule.condition);
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            "group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
                            n.status === "UNREAD" &&
                              "border-yellow-200 bg-yellow-50/30 dark:border-yellow-900/30",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                              n.status === "UNREAD"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{n.title}</h4>
                              {getBadge(n.alertRule.condition)}
                              {n.status === "UNREAD" && (
                                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(n.createdAt), {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </p>
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {n.status === "UNREAD" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t("notifications.markAsRead")}
                                onClick={() => markAsRead.mutate({ id: n.id })}
                                disabled={markAsRead.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("notifications.dismiss")}
                              onClick={() => dismiss.mutate({ id: n.id })}
                              disabled={dismiss.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
