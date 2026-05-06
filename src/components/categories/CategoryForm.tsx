"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/trpc/react";
import type { CategoryType } from "@prisma/client";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
    .default("#6366F1"),
  icon: z.string().max(50).default("circle"),
  parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: {
    id: string;
    name: string;
    type: CategoryType;
    color: string;
    icon: string;
    parentId: string | null;
  } | null;
  onSuccess?: () => void;
}

const defaultIcons = [
  "circle",
  "square",
  "star",
  "heart",
  "dollar-sign",
  "shopping-bag",
  "utensils",
  "car",
  "home",
  "briefcase",
  "gift",
  "plane",
];

export function CategoryForm({ open, onOpenChange, category, onSuccess }: CategoryFormProps) {
  const isEditing = !!category;

  const { data: categories } = api.category.list.useQuery({ type: undefined });

  const createMutation = api.category.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = api.category.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const defaultValues = useMemo(
    () => ({
      name: category?.name ?? "",
      type: category?.type ?? "EXPENSE",
      color: category?.color ?? "#6366F1",
      icon: category?.icon ?? "circle",
      parentId: category?.parentId ?? undefined,
    }),
    [category],
  );

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const submitData = {
      ...data,
      type: data.type as CategoryType,
      parentId: data.parentId || undefined,
    };

    if (isEditing && category) {
      await updateMutation.mutateAsync({
        id: category.id,
        ...submitData,
      });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const potentialParents = categories?.categories.filter(
    (c) => !isEditing || c.id !== category?.id,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the category details below."
              : "Add a new category to organize your transactions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              placeholder="e.g., Food, Salary, Utilities"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value) => form.setValue("type", value as "INCOME" | "EXPENSE")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.watch("color")}
                onChange={(e) => form.setValue("color", e.target.value)}
                className="w-16 h-10 p-1 rounded-md border border-input cursor-pointer"
              />
              <Input
                type="text"
                placeholder="#6366F1"
                {...form.register("color")}
                className="flex-1"
              />
            </div>
            {form.formState.errors.color && (
              <p className="text-sm text-destructive">{form.formState.errors.color.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select
              value={form.watch("icon")}
              onValueChange={(value) => form.setValue("icon", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an icon" />
              </SelectTrigger>
              <SelectContent>
                {defaultIcons.map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    {icon}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category (Optional)</Label>
              <Select
                value={form.watch("parentId") || "none"}
                onValueChange={(value) =>
                  form.setValue("parentId", value === "none" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {potentialParents?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
