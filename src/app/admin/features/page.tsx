"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Globe, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const categoryColors: Record<string, string> = {
  AI: "bg-purple-500",
  WHATSAPP: "bg-green-500",
  PAYMENTS: "bg-blue-500",
  EXPERIMENTAL: "bg-orange-500",
  PREMIUM: "bg-yellow-500",
  DEPRECATED: "bg-gray-500",
};

const categoryLabels: Record<string, string> = {
  AI: "IA",
  WHATSAPP: "WhatsApp",
  PAYMENTS: "Pagamentos",
  EXPERIMENTAL: "Experimental",
  PREMIUM: "Premium",
  DEPRECATED: "Descontinuado",
};

const featureFlagSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  description: z.string().optional(),
  category: z.enum(["AI", "WHATSAPP", "PAYMENTS", "EXPERIMENTAL", "PREMIUM", "DEPRECATED"]),
  isGlobal: z.boolean().default(false),
  tenantId: z.string().optional(),
  enabled: z.boolean().default(false),
});

type FeatureFlagForm = z.infer<typeof featureFlagSchema>;

export default function FeatureFlagsAdminPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const {
    data: flags,
    isLoading,
    refetch,
  } = api.featureFlag.list.useQuery({
    limit: 100,
  });

  const { data: tenants } = api.tenant.list.useQuery();

  const createMutation = api.featureFlag.create.useMutation({
    onSuccess: () => {
      toast({ title: "Feature flag criada com sucesso!" });
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar feature flag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = api.featureFlag.update.useMutation({
    onSuccess: () => {
      toast({ title: "Feature flag atualizada!" });
      setEditingFlag(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = api.featureFlag.toggle.useMutation({
    onSuccess: (data) => {
      toast({
        title: `Feature ${data.enabled ? "ativada" : "desativada"}!`,
      });
      refetch();
    },
  });

  const deleteMutation = api.featureFlag.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Feature flag removida!" });
      refetch();
    },
  });

  const form = useForm<FeatureFlagForm>({
    resolver: zodResolver(featureFlagSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "EXPERIMENTAL",
      isGlobal: true,
      enabled: false,
    },
  });

  const filteredFlags = flags?.flags.filter((flag) => {
    if (search && !flag.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && flag.category !== categoryFilter) return false;
    if (statusFilter !== "all") {
      const isEnabled = statusFilter === "enabled";
      if (flag.enabled !== isEnabled) return false;
    }
    if (scopeFilter !== "all") {
      const isGlobal = scopeFilter === "global";
      if (flag.isGlobal !== isGlobal) return false;
    }
    return true;
  });

  const onSubmit = (data: FeatureFlagForm) => {
    if (editingFlag) {
      updateMutation.mutate({ id: editingFlag, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">Gerencie funcionalidades do sistema</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Feature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Feature Flag</DialogTitle>
              <DialogDescription>Adicione uma nova funcionalidade controlável</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: ai-agent" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Descreva a funcionalidade" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isGlobal"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Escopo Global</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Aplica-se a todos os tenants
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {!form.watch("isGlobal") && (
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenants?.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Ativada</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Habilitar esta funcionalidade
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingFlag ? "Atualizar" : "Criar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar feature..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="enabled">Ativadas</SelectItem>
            <SelectItem value="disabled">Desativadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Escopo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="tenant">Tenant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feature Flags List */}
      <div className="space-y-3">
        {filteredFlags?.map((flag) => (
          <div
            key={flag.id}
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{flag.name}</h3>
                <Badge className={categoryColors[flag.category]}>
                  {categoryLabels[flag.category]}
                </Badge>
                {flag.isGlobal ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Global
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {flag.tenant?.name || "Tenant"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{flag.description || "Sem descrição"}</p>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                checked={flag.enabled}
                onCheckedChange={() => toggleMutation.mutate({ id: flag.id })}
              />
              <Button variant="ghost" size="icon" onClick={() => setEditingFlag(flag.id)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate({ id: flag.id })}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {filteredFlags?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma feature flag encontrada
          </div>
        )}
      </div>
    </div>
  );
}
