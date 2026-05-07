import { PluggySettingsClient } from "./pluggy-settings-client";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie suas conexões bancárias e integrações
        </p>
      </div>

      <PluggySettingsClient />
    </div>
  );
}
