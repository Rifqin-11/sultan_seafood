"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const RowActionMenu = DropdownMenu;

export function RowActionMenuTrigger({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenuTrigger
      render={<Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" aria-label={label} />}
    >
      {children}
    </DropdownMenuTrigger>
  );
}

export function RowActionMenuContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuContent>) {
  return <DropdownMenuContent align="end" className={cn("w-64 p-1.5", className)} {...props} />;
}

export function RowActionMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem className={cn("min-h-11 gap-3 rounded-lg px-3 py-2 text-[15px] font-medium", className)} {...props} />;
}
