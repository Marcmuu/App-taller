import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, label = "Taller" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Wrench className="size-4" aria-hidden />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
