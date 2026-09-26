"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CarFront, Monitor, RotateCcw, Smartphone, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { resetMockDatabase } from "@/lib/mock/store";
import { asset } from "@/lib/routes";

/**
 * Cliente (móvil) y taller (escritorio) en la misma pantalla. Cada iframe
 * tiene su propia sesión (window.name) y comparten la BBDD de prueba, así
 * que lo que hace uno aparece al momento en el otro.
 */
export function DemoStage() {
  // Cambiar la key recarga ambos iframes (volver al login).
  const [round, setRound] = useState(0);

  const restart = () => {
    resetMockDatabase();
    window.sessionStorage.clear();
    setRound((r) => r + 1);
    toast.success("Demo reiniciada");
  };

  return (
    <div className="flex h-dvh flex-col bg-muted/60">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <Logo label="Demo · cliente y taller a la vez" className="min-w-0 text-sm" />
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/guia">
              <BookOpen aria-hidden /> Guía
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={restart}>
            <RotateCcw aria-hidden /> Reiniciar
          </Button>
        </div>
      </header>

      {/* Pantallas pequeñas: no caben los dos paneles */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center lg:hidden">
        <Monitor className="size-10 text-muted-foreground" aria-hidden />
        <p className="max-w-sm text-muted-foreground">
          Esta vista está pensada para ordenador. En el móvil, entra como cliente o como taller por separado:
        </p>
        <div className="grid w-full max-w-xs gap-2">
          <Button asChild size="xl">
            <Link href="/login?tipo=cliente">
              <CarFront aria-hidden /> Entrar como cliente
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/login?tipo=taller">
              <Wrench aria-hidden /> Entrar como taller
            </Link>
          </Button>
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 gap-5 p-5 lg:flex">
        <section className="flex shrink-0 flex-col items-center gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Smartphone className="size-4" aria-hidden /> Cliente (móvil)
          </p>
          <div className="min-h-0 flex-1 rounded-[2.5rem] border-[10px] border-foreground/85 bg-background shadow-xl">
            <iframe
              key={`c-${round}`}
              name="cliente"
              title="App del cliente"
              src={asset("/login/?tipo=cliente")}
              className="h-full w-[375px] rounded-[1.8rem]"
            />
          </div>
        </section>
        <section className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Monitor className="size-4" aria-hidden /> Taller (ordenador)
          </p>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-background shadow-xl">
            <iframe
              key={`t-${round}`}
              name="taller"
              title="Panel del taller"
              src={asset("/login/?tipo=taller")}
              className="size-full"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
