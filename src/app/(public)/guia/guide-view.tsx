"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Pause,
  Play,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { DEMO_PASSWORD } from "@/lib/mock/seed";
import { asset } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_STEPS,
  DEMO_ACCOUNTS,
  STATUS_TABLE,
  WORKSHOP_STEPS,
  type GuideStep,
} from "./guide-content";

export function GuideView() {
  const [tab, setTab] = useState<"customer" | "workshop">("customer");

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="grid size-9 place-items-center rounded-full hover:bg-muted" aria-label="Volver al inicio">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <Logo label="Guía de uso" className="text-sm" />
          <Button asChild size="sm" className="ml-auto">
            <Link href="/demo">Probar la demo</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-10">
        {/* Intro */}
        <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cómo funciona la app del taller</h1>
            <p className="text-lg text-muted-foreground">
              Conecta al taller con sus clientes. El cliente pide cita desde el móvil, sigue la reparación paso a paso
              como si fuera un pedido y aprueba el presupuesto con un botón. El taller lo gestiona todo con un clic por paso.
            </p>
            <p className="text-sm text-muted-foreground">
              No es un ERP: no hay facturación, stock ni contabilidad. Solo la comunicación entre el taller y el cliente.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="xl">
                <Link href="/demo">
                  <Monitor aria-hidden /> Cliente y taller a la vez
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/login?tipo=cliente">
                  <CarFront aria-hidden /> Soy cliente
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/login?tipo=taller">
                  <Wrench aria-hidden /> Soy taller
                </Link>
              </Button>
            </div>
          </div>
          <figure className="space-y-2">
            <video
              controls
              playsInline
              preload="metadata"
              poster={asset("/guia/tutorial-poster.png")}
              className="aspect-video w-full rounded-2xl border bg-black shadow-lg"
            >
              <source src={asset("/guia/tutorial.webm")} type="video/webm" />
              Tu navegador no puede reproducir el vídeo.
            </video>
            <figcaption className="text-center text-sm text-muted-foreground">
              Vídeo: el recorrido completo, desde la cita hasta la recogida (cliente a la izquierda, taller a la derecha).
            </figcaption>
          </figure>
        </section>

        {/* Flujo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">El flujo en una línea</h2>
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {["Pide cita", "Taller confirma", "Deja el coche", "Diagnóstico", "Presupuesto", "Cliente acepta", "Reparación", "Listo para recoger"].map(
              (label, i, all) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="rounded-full border bg-card px-3 py-1.5 font-medium">
                    <span className="mr-1.5 text-muted-foreground">{i + 1}</span>
                    {label}
                  </span>
                  {i < all.length - 1 && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
                </li>
              ),
            )}
          </ol>
        </section>

        {/* Recorrido visual */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Recorrido paso a paso</h2>
              <p className="text-muted-foreground">Capturas reales de la app. Pulsa play o avanza con las flechas.</p>
            </div>
            <div className="inline-flex rounded-full border bg-card p-1" role="tablist" aria-label="Tipo de usuario">
              {([
                ["customer", "Cliente", CarFront],
                ["workshop", "Taller", Wrench],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition",
                    tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>
          <StepViewer key={tab} steps={tab === "customer" ? CUSTOMER_STEPS : WORKSHOP_STEPS} />
        </section>

        {/* Estados */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Estados de una reparación</h2>
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-140 text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Quién</th>
                  <th className="px-4 py-3">Cómo se llega</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {STATUS_TABLE.map((row, i) => (
                  <tr key={row.status}>
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{row.status}</td>
                    <td className="px-4 py-3">{row.who}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada cambio queda guardado con quién lo hizo y cuándo, y el cliente recibe un aviso al momento.
          </p>
        </section>

        {/* Probar */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-semibold">Cómo probarlo</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                En ordenador, abre <Link href="/demo" className="font-medium text-primary hover:underline">Cliente y taller a la vez</Link>:
                verás el móvil del cliente a la izquierda y el panel del taller a la derecha.
              </li>
              <li>Entra como Carlos (cliente) y como Laura (taller) pulsando sus nombres.</li>
              <li>Como cliente, pide una cita para el Toyota Yaris. Mira cómo aparece al momento en el taller.</li>
              <li>Como taller, confirma, marca recibido, diagnostica, crea el presupuesto y envíalo.</li>
              <li>Como cliente, acepta el presupuesto. El taller termina la reparación y el cliente ve «Listo para recoger».</li>
            </ol>
            <p className="text-sm text-muted-foreground">
              En el móvil también funciona: abre dos pestañas, una como cliente y otra como taller.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-semibold">Cuentas de prueba</h2>
            <p className="text-sm text-muted-foreground">
              Contraseña de todas: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{DEMO_PASSWORD}</code>{" "}
              (o pulsa el nombre en la pantalla de entrada).
            </p>
            <ul className="divide-y text-sm">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="flex flex-wrap justify-between gap-x-4 py-2">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">{a.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-6 text-sm">
          <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
          <Faq q="¿Se guarda lo que hago?">
            Es una demo: los datos son de prueba y se guardan solo en tu navegador. Nadie más los ve. El botón «Demo» (arriba a la
            derecha dentro de la app) o «Reiniciar» en la vista doble vuelven a dejarlo todo como al principio.
          </Faq>
          <Faq q="¿Por qué los cambios aparecen solos?">
            Las dos partes están conectadas «en tiempo real»: lo que hace el taller aparece en el móvil del cliente sin recargar, y al revés.
            También salen avisos emergentes.
          </Faq>
          <Faq q="¿Se puede instalar en el móvil?">
            Sí, es una web instalable: desde el navegador del móvil, «Añadir a pantalla de inicio».
          </Faq>
          <Faq q="¿Qué no hace (a propósito)?">
            No es un ERP: no hay facturación, stock, proveedores ni contabilidad. Solo la comunicación entre el taller y el cliente.
          </Faq>
        </section>
      </main>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border px-4 py-3 open:bg-muted/30">
      <summary className="cursor-pointer list-none font-medium">
        <span className="mr-2 inline-block transition group-open:rotate-90">›</span>
        {q}
      </summary>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </details>
  );
}

function StepViewer({ steps }: { steps: GuideStep[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = steps[index];

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % steps.length), 6500);
    return () => clearTimeout(timer);
  }, [playing, index, steps.length]);

  const go = (delta: number) => {
    setPlaying(false);
    setIndex((i) => (i + delta + steps.length) % steps.length);
  };

  return (
    <div
      className={cn(
        "grid gap-6 rounded-3xl border bg-card p-4 sm:p-6",
        step.frame === "phone" ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]",
      )}
    >
      <div className="flex items-start justify-center rounded-2xl bg-muted/60 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- capturas estáticas en /public */}
        <img
          key={step.id}
          src={asset(`/guia/${step.image}.png`)}
          alt={step.title}
          className={cn(
            "animate-in fade-in rounded-xl border bg-background shadow-md duration-300",
            step.frame === "phone" ? "max-h-160 w-auto max-w-75" : "w-full",
          )}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" onClick={() => go(-1)} aria-label="Paso anterior">
            <ChevronLeft aria-hidden />
          </Button>
          <Button variant={playing ? "secondary" : "default"} size="lg" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            {playing ? "Pausa" : "Reproducir"}
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => go(1)} aria-label="Paso siguiente">
            <ChevronRight aria-hidden />
          </Button>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {index + 1} / {steps.length}
          </span>
        </div>

        <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <div key={step.id} className="animate-in fade-in space-y-3 duration-300">
          <h3 className="text-xl font-semibold">{step.title}</h3>
          <p className="text-muted-foreground">{step.text}</p>
          {step.tips && (
            <ul className="space-y-1.5 text-sm">
              {step.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ol className="mt-auto grid gap-1 border-t pt-4 text-sm">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setIndex(i);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                  i === index ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="w-5 text-xs tabular-nums">{i + 1}</span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
