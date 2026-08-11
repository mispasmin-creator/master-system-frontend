import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | undefined;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = status?.toLowerCase() || "unknown";
  
  const variants: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200/50",
    "not done": "bg-amber-50 text-amber-700 border-amber-200/50",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    done: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    delayed: "bg-rose-50 text-rose-700 border-rose-200/50",
    processing: "bg-blue-50 text-blue-700 border-blue-200/50",
    "in progress": "bg-blue-50 text-blue-700 border-blue-200/50",
    "in transit": "bg-indigo-50 text-indigo-700 border-indigo-200/50",
    requested: "bg-violet-50 text-violet-700 border-violet-200/50",
    verified: "bg-teal-50 text-teal-700 border-teal-200/50",
    default: "bg-slate-50 text-slate-600 border-slate-200/50",
  };

  const dotVariants: Record<string, string> = {
    pending: "bg-amber-500",
    "not done": "bg-amber-500",
    completed: "bg-emerald-500",
    done: "bg-emerald-500",
    delayed: "bg-rose-500",
    processing: "bg-blue-500",
    "in progress": "bg-blue-500",
    "in transit": "bg-indigo-500",
    requested: "bg-violet-500",
    verified: "bg-teal-500",
    default: "bg-slate-400",
  };

  const currentVariant = variants[s] || variants.default;
  const currentDot = dotVariants[s] || dotVariants.default;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-sm shadow-slate-900/[0.02]",
        currentVariant, 
        className
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full", currentDot)} />
      {status || "N/A"}
    </div>
  );
}
