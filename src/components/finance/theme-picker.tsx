"use client";

import * as React from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { THEME_LIST, useTheme, type AppTheme } from "@/lib/theme-context";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const current = THEME_LIST.find((t) => t.id === theme);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          aria-label="Ganti tema"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">{current?.emoji}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="mb-2 px-2 pt-1 text-xs font-semibold text-muted-foreground">
          Pilih Tema Tampilan
        </p>
        <div className="space-y-0.5">
          {THEME_LIST.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id as AppTheme);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent",
                theme === t.id && "bg-accent",
              )}
            >
              <span className="text-xl">{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.description}
                </p>
              </div>
              {theme === t.id && (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
