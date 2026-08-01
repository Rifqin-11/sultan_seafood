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
    <header className={cn("flex flex-col justify-between gap-5 rounded-2xl border border-stone-200/80 bg-white/85 px-5 py-5 shadow-[0_18px_48px_-32px_rgba(28,25,23,0.38)] backdrop-blur sm:flex-row sm:items-center sm:px-6 sm:py-6", className)}>
      <div className="min-w-0">
        <h2 className="text-2xl font-bold leading-tight tracking-[-0.035em] text-foreground text-balance sm:text-[1.75rem]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">
          {children}
        </div>
      )}
    </header>
  );
}
