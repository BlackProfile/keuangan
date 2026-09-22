"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Breadcrumb segments, e.g. ["Pengaturan", "Keamanan"] */
  crumbs: string[];
  onBack: () => void;
  className?: string;
}

/**
 * Simple breadcrumb bar with a back button.
 *
 * Renders: ‹ HubName › SubPageName (last crumb is highlighted).
 */
export function Breadcrumb({ crumbs, onBack, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-xl border border-border bg-card/50 px-2.5 py-2 backdrop-blur-sm",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-8 shrink-0 gap-1 px-2 text-muted-foreground hover:text-foreground"
        aria-label="Kembali"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-xs">Kembali</span>
      </Button>

      {crumbs.length > 0 && (
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <React.Fragment key={`${c}-${i}`}>
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                )}
                <span
                  className={cn(
                    "shrink-0 truncate text-xs",
                    isLast
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {c}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
