"use client";

import { Loader2 } from "lucide-react";
import { useMemo } from "react";
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
import { SmartForm, type SmartField } from "@/components/ui/smart-form";
import { api } from "@/lib/trpc/react";
import { CategoryType } from "@prisma/client";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum([CategoryType.INCOME, CategoryType.EXPENSE]),
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
  { label: "Circle", value: "circle" },
  { label: "Square", value: "square" },
  { label: "Star", value: "star" },
  { label: "Heart", value: "heart" },
  { label: "Dollar Sign", value: "dollar-sign" },
  { label: "Shopping Bag", value: "shopping-bag" },
  { label: "Utensils", value: "utensils" },
  { label: "Car", value: "car" },
  { label: "Home", value: "home" },
  { label: "Briefcase", value: "briefcase" },
  { label: "Gift", value: "gift" },
  { label: "Plane", value: "plane" },
];

export function CategoryForm({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormProps) {
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
      type: category?.type ?? CategoryType.EXPENSE,
      color: category?.color ?? "#6366F1",
      icon: category?.icon ?? "circle",
      parentId: category?.parentId ?? undefined,
    }),
    [category]
  );

  const handleSubmit = async (data: CategoryFormData) => {
    if (isEditing && category) {
      await updateMutation.mutateAsync({
        id: category.id,
        ...data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const fields = useMemo<SmartField<CategoryFormData>[]>(
    () => [
      {
        name: "name",
        label: "Category Name",
        type: "text",
        placeholder: "e.g., Food, Salary, Utilities",
        required: true,
      },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Income", value: "INCOME" },
          { label: "Expense", value: "EXPENSE" },
        ],
      },
      {
        name: "color",
        label: "Color",
        type: "custom",
        customRender: ({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-16 h-10 p-1 rounded-md border border-input cursor-pointer"
            />
            <input
              type="text"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="#6366F1"
              className="flex-1 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>
        ),
      },
      {
        name: "icon",
        label: "Icon",
        type: "select",
        options: defaultIcons,
      },
      ...(!isEditing
        ? [
            {
              name: "parentId" as const,
              label: "Parent Category (Optional)",
              type: "select" as const,
              placeholder: "Select parent category",
              options: [
                { label: "No parent (top-level)", value: "" },
                ...(categories?.categories.map((cat) => ({
                  label: cat.name,
                  value: cat.id,
                })) ?? []),
              ],
              transform: {
                output: (value) => (value === "" ? undefined : value),
              },
            },
          ]
        : []),
    ],
    [isEditing, categories]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "New Category"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the category details below."
              : "Add a new category to organize your transactions."}
          </DialogDescription>
        </DialogHeader>

        <SmartForm
          schema={categorySchema}
          fields={fields}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          footer={
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
          }
        />
      </DialogContent>
    </Dialog>
  );
}
