"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline pending indicator for a <Link>. Must be rendered inside that Link.
 * Uses an animation delay so fast navigation does not flash a spinner.
 */
export function LinkPendingIndicator({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <Loader2
      aria-hidden
      className={cn(
        "pointer-events-none size-3.5 shrink-0 animate-spin transition-opacity duration-150",
        "opacity-0 delay-150",
        pending && "opacity-100",
        className,
      )}
    />
  );
}
