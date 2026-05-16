"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/trpc/react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t, i18n } = useTranslation(["common", "settings"]);
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const utils = api.useUtils();

  const { data: profile } = api.user.profile.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async (data) => {
      await update({ user: { name: data.name, image: data.image } });
      await utils.user.profile.invalidate();
      setIsEditing(false);
      setEditName("");
    },
    onError: (err) => {
      console.error("update profile failed:", err.message);
    },
  });

  const currentLanguage = i18n.language === "en" ? "en" : "pt";

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === profile?.name) {
      setIsEditing(false);
      return;
    }
    updateProfile.mutate({ name: trimmed });
  };

  const handleToggleLanguage = () => {
    const next = currentLanguage === "pt" ? "en" : "pt";
    i18n.changeLanguage(next);
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/sign-in" });
  };

  return (
    <div className="space-y-4 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {t("settings:title", { ns: "settings" })}
        </h1>
        <p className="text-[11px] text-muted-foreground">
          {t("settings:description", { ns: "settings" })}
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border bg-background p-3 space-y-3">
        <h3 className="text-[13px] font-semibold">{t("settings:profile", { ns: "settings" })}</h3>

        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || ""}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[13px] font-medium">
              {(session?.user?.name?.[0] || session?.user?.email?.[0] || "?").toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("name", { ns: "common" })}
                  className="h-8 text-[13px] flex-1"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={handleSaveName}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending
                    ? t("saving", { ns: "settings" })
                    : t("save", { ns: "common" })}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[11px]"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName("");
                  }}
                >
                  {t("cancel", { ns: "common" })}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {profile?.name || session?.user?.name || "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {profile?.email || session?.user?.email}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] shrink-0"
                  onClick={() => {
                    setEditName(profile?.name || session?.user?.name || "");
                    setIsEditing(true);
                  }}
                >
                  {t("edit", { ns: "common" })}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-lg border bg-background p-3 space-y-3">
        <h3 className="text-[13px] font-semibold">
          {t("settings:preferences", { ns: "settings" })}
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px]">{t("settings:darkMode", { ns: "settings" })}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("settings:darkModeDesc", { ns: "settings" })}
            </p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={handleToggleTheme} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px]">{t("settings:language", { ns: "settings" })}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("settings:languageDesc", { ns: "settings" })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            onClick={handleToggleLanguage}
          >
            {currentLanguage === "pt" ? "Português" : "English"}
          </Button>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-lg border bg-background p-3 space-y-3">
        <h3 className="text-[13px] font-semibold">{t("settings:account", { ns: "settings" })}</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px]">{t("settings:logout", { ns: "settings" })}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("settings:logoutDesc", { ns: "settings" })}
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-[11px]"
            onClick={handleLogout}
          >
            {t("settings:logoutBtn", { ns: "settings" })}
          </Button>
        </div>
      </div>
    </div>
  );
}
