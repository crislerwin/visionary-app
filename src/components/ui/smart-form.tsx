"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import React, { useCallback } from "react";
import {
  Controller,
  type ControllerRenderProps,
  useForm,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "date"
  | "checkbox"
  | "custom";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SmartField<T extends FieldValues = FieldValues> {
  name: Path<T>;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  options?: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  // Para campos custom - componente customizado
  customRender?: (props: {
    field: ControllerRenderProps<T, Path<T>>;
    form: UseFormReturn<T>;
  }) => React.ReactNode;
  // Transformações de valor (entrada/saída)
  transform?: {
    input?: (value: unknown) => unknown;
    output?: (value: unknown) => unknown;
  };
}

export interface SmartFormProps<T extends FieldValues = FieldValues> {
  // Schema de validação Zod
  schema: z.ZodType<T, z.ZodTypeDef, T>;
  // Configuração dos campos
  fields: SmartField<T>[];
  // Valores iniciais
  defaultValues?: Partial<T>;
  // Callback de submit
  onSubmit: (data: T) => void | Promise<void>;
  // Texto do botão de submit
  submitText?: string;
  // Loading state
  isLoading?: boolean;
  // Classes customizadas
  className?: string;
  // Layout: vertical ou horizontal
  layout?: "vertical" | "horizontal";
  // Gap entre campos
  gap?: "sm" | "md" | "lg";
  // Footer customizado (pode substituir o botão padrão)
  footer?: React.ReactNode | ((form: UseFormReturn<T>) => React.ReactNode);
  // Erros do servidor para mostrar
  serverErrors?: Partial<Record<Path<T>, string>>;
}

// ============================================
// Componente SmartForm
// ============================================

export function SmartForm<T extends FieldValues>({
  schema,
  fields,
  defaultValues,
  onSubmit,
  submitText = "Submit",
  isLoading = false,
  className,
  layout = "vertical",
  gap = "md",
  footer,
  serverErrors,
}: SmartFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as T,
  });

  // Aplicar erros do servidor
  React.useEffect(() => {
    if (serverErrors) {
      for (const [key, value] of Object.entries(serverErrors)) {
        if (value) {
          form.setError(key as Path<T>, {
            type: "server",
            message: value,
          });
        }
      }
    }
  }, [serverErrors, form]);

  const handleSubmit = useCallback(
    async (data: T) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  const layoutClasses = {
    vertical: "flex flex-col",
    horizontal: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn(layoutClasses[layout], gapClasses[gap], className)}
    >
      {fields.map((field) => (
        <SmartFieldComponent
          key={field.name}
          field={field}
          form={form}
        />
      ))}

      <div className={cn(
        "flex items-center justify-end",
        layout === "horizontal" && "col-span-full"
      )}>
        {footer ? (
          typeof footer === "function" ? (
            footer(form)
          ) : (
            footer
          )
        ) : (
          <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
            {(isLoading || form.formState.isSubmitting) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {submitText}
          </Button>
        )}
      </div>
    </form>
  );
}

// ============================================
// Componente de Campo Individual
// ============================================

function SmartFieldComponent<T extends FieldValues>({
  field,
  form,
}: {
  field: SmartField<T>;
  form: UseFormReturn<T>;
}) {
  const { control, formState: { errors } } = form;
  const error = errors[field.name];

  const labelContent = (
    <Label htmlFor={field.name} className={cn(field.required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
      {field.label}
    </Label>
  );

  return (
    <div className={cn("space-y-2", field.className)}>
      {field.type !== "checkbox" && labelContent}

      <Controller
        name={field.name}
        control={control}
        render={({ field: controllerField }) => {
          // Aplicar transformação de input se existir
          const value = field.transform?.input
            ? field.transform.input(controllerField.value)
            : controllerField.value;

          const handleChange = (newValue: unknown) => {
            const transformed = field.transform?.output
              ? field.transform.output(newValue)
              : newValue;
            controllerField.onChange(transformed);
          };

          if (field.type === "custom" && field.customRender) {
            return field.customRender({ field: controllerField, form });
          }

          switch (field.type) {
            case "text":
            case "email":
            case "password":
              return (
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  {...controllerField}
                  value={(value as string | undefined) || ""}
                />
              );

            case "number":
              return (
                <Input
                  id={field.name}
                  type="number"
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  {...controllerField}
                  value={(value as string | number | undefined) || ""}
                  onChange={(e) => handleChange(e.target.valueAsNumber || 0)}
                />
              );

            case "textarea":
              return (
                <textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  {...controllerField}
                  value={(value as string | undefined) || ""}
                  className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    error && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              );

            case "select":
              return (
                <Select
                  value={value as string}
                  onValueChange={handleChange}
                  disabled={field.disabled}
                >
                  <SelectTrigger id={field.name} className={cn(error && "border-destructive")}>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );

            case "date":
              return (
                <Input
                  id={field.name}
                  type="date"
                  disabled={field.disabled}
                  {...controllerField}
                  value={value ? new Date(value as string | Date).toISOString().split("T")[0] : ""}
                  onChange={(e) => handleChange(e.target.valueAsDate)}
                />
              );

            case "checkbox":
              return (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={field.name}
                    disabled={field.disabled}
                    checked={!!value}
                    onChange={(e) => handleChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  {labelContent}
                </div>
              );

            default:
              return null;
          }
        }}
      />

      {field.description && !error && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}

      {error && (
        <p className="text-sm font-medium text-destructive">
          {error.message as string}
        </p>
      )}
    </div>
  );
}

// ============================================
// Hooks úteis
// ============================================

export function useSmartForm<T extends FieldValues>(
  schema: z.ZodType<T, z.ZodTypeDef, T>,
  defaultValues?: Partial<T>
) {
  return useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as T,
  });
}

export { zodResolver };
