"use client";

import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

export function TenantSwitcher() {
  const router = useRouter();
  const { currentTenant, setCurrentTenant, tenants } = useCurrentTenant();
  const [open, setOpen] = React.useState(false);
  const [showNewTenantDialog, setShowNewTenantDialog] = React.useState(false);
  const [newTenantName, setNewTenantName] = React.useState("");
  const [newTenantSlug, setNewTenantSlug] = React.useState("");

  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: (data) => {
      setCurrentTenant(data.id);
      setShowNewTenantDialog(false);
      router.push("/dashboard");
    },
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTenant.mutateAsync({
      name: newTenantName,
      slug: newTenantSlug,
    });
  };

  return (
    <Dialog open={showNewTenantDialog} onOpenChange={setShowNewTenantDialog}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-label="Select a tenant"
            className={cn(
              "w-full justify-between h-8 px-2 text-xs",
              !currentTenant && "text-muted-foreground",
            )}
          >
            <Building2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{currentTenant?.name || "Select tenant..."}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]" align="start">
          <DropdownMenuLabel>Tenants</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants?.map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => {
                setCurrentTenant(tenant.id);
                router.push("/dashboard");
              }}
            >
              <Building2 className="mr-2 h-4 w-4" />
              {tenant.name}
              <Check
                className={cn(
                  "ml-auto h-4 w-4",
                  currentTenant?.id === tenant.id ? "opacity-100" : "opacity-0",
                )}
              />
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setOpen(false);
              setShowNewTenantDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Tenant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
