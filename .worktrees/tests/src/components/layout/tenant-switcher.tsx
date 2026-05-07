"use client";

import { Building2, Check, Plus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

export function TenantSwitcher() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentTenant, setCurrentTenant, tenants } = useCurrentTenant();
  const [open, setOpen] = React.useState(false);
  const [showNewTenantDialog, setShowNewTenantDialog] = React.useState(false);
  const [newTenantName, setNewTenantName] = React.useState("");
  const [newTenantSlug, setNewTenantSlug] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  React.useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    }
  }, [open]);

  const filteredTenants = React.useMemo(() => {
    if (!searchQuery.trim()) return tenants ?? [];
    const query = searchQuery.toLowerCase();
    return (tenants ?? []).filter((t) => t.name.toLowerCase().includes(query));
  }, [tenants, searchQuery]);

  const isBackoffice = session?.user?.isBackoffice ?? false;

  // biome-ignore lint/suspicious/noExplicitAny: tRPC RC type workaround
  const createTenant = (trpc.tenant.create.useMutation as any)({
    onSuccess: (data: { id: string }) => {
      setCurrentTenant(data.id);
      setShowNewTenantDialog(false);
      router.push("/dashboard");
    },
  });

  const handleSwitchTenant = async (tenantId: string) => {
    setCurrentTenant(tenantId);
    await utils.invalidate();
    router.refresh();
    router.push("/dashboard");
    setOpen(false);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTenant.mutateAsync({
      name: newTenantName,
      slug: newTenantSlug,
    });
  };

  if (!isBackoffice) {
    return (
      <div className="flex items-center gap-2 h-8 px-2 text-xs w-full">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{currentTenant?.name || "—"}</span>
      </div>
    );
  }

  return (
    <Dialog open={showNewTenantDialog} onOpenChange={setShowNewTenantDialog}>
      <Popover
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setSearchQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-label="Select a tenant"
            className="w-full justify-between h-8 px-2 text-xs hover:bg-accent"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{currentTenant?.name || "Select tenant..."}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" side="bottom" sideOffset={4}>
          <div className="flex flex-col max-h-80">
            {/* Fixed search header */}
            <div className="shrink-0 border-b px-2 py-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tenant..."
                  className="w-full rounded-sm bg-transparent py-1.5 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Scrollable tenant list */}
            <div className="flex-1 overflow-y-auto py-1">
              {filteredTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSwitchTenant(tenant.id)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                  )}
                >
                  <span className="truncate">{tenant.name}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      currentTenant?.id === tenant.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              ))}
              {filteredTenants.length === 0 && (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  Nenhum tenant encontrado
                </div>
              )}
            </div>

            {/* Fixed footer with create button */}
            <div className="shrink-0 border-t bg-background p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearchQuery("");
                  setShowNewTenantDialog(true);
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground",
                  "text-muted-foreground hover:text-foreground",
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Criar Tenant</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DialogContent>
        <form onSubmit={handleCreateTenant}>
          <DialogHeader>
            <DialogTitle>Create Tenant</DialogTitle>
            <DialogDescription>Create a new tenant to organize your work.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={newTenantSlug}
                onChange={(e) => {
                  setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="acme"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewTenantDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTenant.isPending}>
              {createTenant.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
