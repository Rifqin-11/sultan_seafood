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
        "bg-white rounded-2xl border border-border p-5 shadow-card transition-all",
        href && "hover:shadow-md cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          {internal && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 flex-shrink-0">
              Internal
            </span>
          )}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="mb-2">
        <span className="text-2xl font-bold text-foreground tracking-tight">
          {displayValue}
        </span>
        {suffix && (
          <span className="text-sm font-medium text-muted-foreground ml-1">
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
