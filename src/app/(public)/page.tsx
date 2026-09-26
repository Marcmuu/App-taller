import Link from "next/link";
import { CarFront, ChevronRight, Monitor, PlayCircle, Wrench } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SessionRedirect } from "./session-redirect";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-10 px-5 py-12">
      <SessionRedirect />
      <div className="space-y-4">
        <Logo label="Taller Martínez" className="text-lg" />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Tu coche, siempre a la vista.</h1>
          <p className="text-muted-foreground">
            Pide cita, sigue la reparación paso a paso y aprueba el presupuesto desde el móvil.
          </p>
        </div>
      </div>

      <nav className="grid gap-3" aria-label="Elige cómo entrar">
        <EntryCard
          href="/login?tipo=cliente"
          icon={<CarFront className="size-6" aria-hidden />}
          title="Soy cliente"
          description="Seguir mi coche o pedir cita"
        />
        <EntryCard
          href="/login?tipo=taller"
          icon={<Wrench className="size-6" aria-hidden />}
          title="Soy del taller"
          description="Gestionar vehículos y presupuestos"
        />
      </nav>

      <div className="flex flex-col gap-2 rounded-2xl border border-dashed p-4 text-sm">
        <p className="font-medium">¿Primera vez? Es una demo con datos de prueba.</p>
        <Link href="/guia" className="inline-flex items-center gap-2 text-primary hover:underline">
          <PlayCircle className="size-4" aria-hidden /> Ver la guía y el vídeo
        </Link>
        <Link href="/demo" className="inline-flex items-center gap-2 text-primary hover:underline">
          <Monitor className="size-4" aria-hidden /> Probar cliente y taller a la vez (ordenador)
        </Link>
      </div>
    </main>
  );
}

function EntryCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <span className="flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
