"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export interface Shift {
  open: string;
  close: string;
  id?: string;
}

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type BusinessHours = Partial<Record<DayKey, Shift[]>>;

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "monday", label: "Segunda-feira", short: "Seg" },
  { key: "tuesday", label: "Terça-feira", short: "Ter" },
  { key: "wednesday", label: "Quarta-feira", short: "Qua" },
  { key: "thursday", label: "Quinta-feira", short: "Qui" },
  { key: "friday", label: "Sexta-feira", short: "Sex" },
  { key: "saturday", label: "Sábado", short: "Sáb" },
  { key: "sunday", label: "Domingo", short: "Dom" },
];

interface BusinessHoursEditorProps {
  value: BusinessHours;
  onChange: (value: BusinessHours) => void;
}

export function BusinessHoursEditor({ value, onChange }: BusinessHoursEditorProps) {
  const [activeDay, setActiveDay] = useState<DayKey>("monday");

  const addShift = (day: DayKey) => {
    const current = value[day] ?? [];
    onChange({
      ...value,
      [day]: [...current, { open: "08:00", close: "18:00", id: crypto.randomUUID() }],
    });
  };

  const removeShift = (day: DayKey, index: number) => {
    const current = value[day] ?? [];
    const updated = current.filter((_, i) => i !== index);
    if (updated.length === 0) {
      const next = { ...value };
      delete next[day];
      onChange(next);
    } else {
      onChange({ ...value, [day]: updated });
    }
  };

  const updateShift = (day: DayKey, index: number, field: keyof Shift, val: string) => {
    const current = value[day] ?? [];
    const updated = current.map((s, i) => (i === index ? { ...s, [field]: val } : s));
    onChange({ ...value, [day]: updated });
  };

  const copyToAll = (sourceDay: DayKey) => {
    const shifts = value[sourceDay];
    if (!shifts || shifts.length === 0) return;
    const next: BusinessHours = { ...value };
    for (const day of DAYS.map((d) => d.key)) {
      if (day !== sourceDay) {
        next[day] = shifts.map((s) => ({ ...s }));
      }
    }
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((day) => {
          const hasHours = (value[day.key]?.length ?? 0) > 0;
          const isActive = activeDay === day.key;
          return (
            <button
              type="button"
              key={day.key}
              onClick={() => setActiveDay(day.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-foreground text-background"
                  : hasHours
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {day.short}
            </button>
          );
        })}
      </div>

      {/* Active day editor */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">{DAYS.find((d) => d.key === activeDay)?.label}</h4>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToAll(activeDay)}
              disabled={!value[activeDay]?.length}
              className="text-xs h-8"
            >
              Copiar para todos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addShift(activeDay)}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Turno
            </Button>
          </div>
        </div>

        {(value[activeDay]?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">Fechado neste dia</p>
        )}

        <div className="space-y-2">
          {value[activeDay]?.map((shift, index) => (
            <div key={shift.id ?? `${activeDay}-${index}`} className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Abertura</Label>
                  <input
                    type="time"
                    value={shift.open}
                    onChange={(e) => updateShift(activeDay, index, "open", e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Fechamento</Label>
                  <input
                    type="time"
                    value={shift.close}
                    onChange={(e) => updateShift(activeDay, index, "close", e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeShift(activeDay, index)}
                className="text-destructive h-9 w-9 mt-4"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
