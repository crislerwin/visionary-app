"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HexColorPicker } from "react-colorful";

interface ColorPickerButtonProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
  disabled?: boolean;
}

export function ColorPickerButton({
  color,
  onChange,
  label,
  disabled = false,
}: ColorPickerButtonProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 w-full rounded-md border px-2 py-1.5 bg-background hover:bg-accent transition-colors",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <div
              className="h-4 w-4 rounded-full border shadow-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-mono uppercase flex-1 text-left">{color}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-3 space-y-2">
          <HexColorPicker
            color={color}
            onChange={onChange}
            style={{ width: "100%", height: "120px" }}
          />
          <Input
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs font-mono uppercase"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
