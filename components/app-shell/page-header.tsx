import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground leading-tight tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">{children}</div>
      )}
    </div>
  );
}
