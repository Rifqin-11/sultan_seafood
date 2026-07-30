import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface MetricCardProps {
  title: string;
  value: string | number;
  isCurrency?: boolean;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  href?: string;
  suffix?: string;
  className?: string;
  internal?: boolean;
}

export function MetricCard({
  title,
  value,
  isCurrency = false,
  change,
  changeLabel,
  icon: Icon,
  href,
  suffix,
  className,
  internal = false,
}: MetricCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(value as number)
    : value;

  const changePositive = change !== undefined && change > 0;
  const changeNegative = change !== undefined && change < 0;

  const content = (
    <div
      className={cn(
        "bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-card transition-all overflow-hidden",
        href && "hover:shadow-md cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          {internal && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 shrink-0">
              Internal
            </span>
          )}
        </div>
        {Icon && (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="mb-1 sm:mb-2 min-w-0">
        <span className="text-lg sm:text-2xl font-bold text-foreground tracking-tight truncate block">
          {displayValue}
        </span>
        {suffix && (
          <span className="text-xs sm:text-sm font-medium text-muted-foreground ml-1">
            {suffix}
          </span>
        )}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1">
          {changePositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-600" />
          ) : changeNegative ? (
            <TrendingDown className="w-3 h-3 text-red-500" />
          ) : (
            <Minus className="w-3 h-3 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              changePositive && "text-emerald-600",
              changeNegative && "text-red-500",
              !changePositive && !changeNegative && "text-muted-foreground"
            )}
          >
            {change > 0 ? "+" : ""}
            {formatPercent(change)}
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
