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
import { useData, useSessionUserId } from "@/lib/data/hooks";
import { resetMockDatabase, setSessionUserId } from "@/lib/mock/store";
import { cn } from "@/lib/utils";

/**
 * Herramienta solo para la fase con datos falsos: cambiar de usuario al vuelo
 * y reiniciar la BBDD de prueba. Se elimina al conectar Supabase.
 */
export function DemoSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const currentId = useSessionUserId();
  const accounts = useData((s) =>
    s.auth_users.flatMap((u) => {
      const profile = s.db.profiles.find((p) => p.id === u.id);
      return profile ? [{ ...profile, email: u.email }] : [];
    }),
  );

  const staff = accounts.filter((a) => a.role !== "customer");
  const customers = accounts.filter((a) => a.role === "customer");

  const switchTo = (id: string, isStaff: boolean) => {
    setSessionUserId(id);
    router.replace(isStaff ? "/taller" : "/app");
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
            <DropdownMenuItem key={a.id} onSelect={() => switchTo(a.id, true)} disabled={a.id === currentId}>
              <Wrench aria-hidden />
              <span className="truncate">{a.full_name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {a.role === "workshop_admin" ? "Admin" : "Mecánico"}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {customers.map((a) => (
            <DropdownMenuItem key={a.id} onSelect={() => switchTo(a.id, false)} disabled={a.id === currentId}>
              <UserRound aria-hidden />
              <span className="truncate">{a.full_name}</span>
              <span className="ml-auto text-xs text-muted-foreground">Cliente</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            resetMockDatabase();
            toast.success("Datos de prueba reiniciados");
          }}
        >
          <RotateCcw aria-hidden />
          Reiniciar datos de prueba
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
