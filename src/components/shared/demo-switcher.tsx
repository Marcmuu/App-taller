"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, RotateCcw, UserRound, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resetDemoData, switchDemoUser } from "@/lib/data/actions";
import { DEMO_MODE } from "@/lib/data/backend";
import { useSessionUserId } from "@/lib/data/hooks";
import { DEMO_PEOPLE } from "@/lib/mock/seed";
import { cn } from "@/lib/utils";

/**
 * Herramienta de la demo: cambiar de cuenta al vuelo y reiniciar los datos
 * de prueba. No aparece cuando la instalación no está en modo demo.
 */
export function DemoSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const currentId = useSessionUserId();
  if (!DEMO_MODE) return null;

  const staff = DEMO_PEOPLE.filter((a) => a.role !== "customer");
  const customers = DEMO_PEOPLE.filter((a) => a.role === "customer");

  const switchTo = async (id: string, isStaff: boolean) => {
    try {
      await switchDemoUser(id);
      router.replace(isStaff ? "/taller" : "/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar de cuenta");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 rounded-full border-dashed bg-background/90 shadow-sm backdrop-blur", className)}
        >
          <FlaskConical className="size-3.5" aria-hidden />
          Demo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Entrar como… (datos de prueba)</DropdownMenuLabel>
        <DropdownMenuGroup>
          {staff.map((a) => (
            <DropdownMenuItem key={a.id} onSelect={() => void switchTo(a.id, true)} disabled={a.id === currentId}>
              <Wrench aria-hidden />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{a.role === "workshop_admin" ? "Admin" : "Mecánico"}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {customers.map((a) => (
            <DropdownMenuItem key={a.id} onSelect={() => void switchTo(a.id, false)} disabled={a.id === currentId}>
              <UserRound aria-hidden />
              <span className="truncate">{a.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">Cliente</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            try {
              await resetDemoData();
              toast.success("Datos de prueba reiniciados");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "No se pudo reiniciar");
            }
          }}
        >
          <RotateCcw aria-hidden />
          Reiniciar datos de prueba
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
