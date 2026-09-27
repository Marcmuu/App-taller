"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CarFront, House, MessageCircle, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AuthGuard, DataGate, FullPageLoader } from "@/components/shared/guards";
import { DemoSwitcher } from "@/components/shared/demo-switcher";
import { LiveNotifier } from "@/components/shared/live-notifier";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { countAllUnread, getDefaultWorkshop } from "@/lib/data/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/vehicles", label: "Vehículos", icon: CarFront },
  { href: "/app/profile", label: "Perfil", icon: UserRound },
] as const;

/** Rutas de primer nivel: llevan cabecera con logo y barra inferior. */
const TOP_LEVEL = new Set(["/app", "/app/vehicles", "/app/profile", "/app/notifications"]);

export function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <DataGate>
      <AuthGuard area="customer">
        <Shell>{children}</Shell>
      </AuthGuard>
    </DataGate>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname().replace(/(.)\/$/, "$1"); // sin barra final (trailingSlash)
  const topLevel = TOP_LEVEL.has(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <LiveNotifier />
      {topLevel && <TopBar />}
      <main className={cn("mx-auto w-full max-w-lg flex-1 px-4", topLevel ? "pb-28 pt-2" : "pb-10")}>
        <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
      </main>
      {topLevel && <BottomNav pathname={pathname} />}
    </div>
  );
}

function TopBar() {
  const profile = useRequiredProfile();
  const workshop = useData((s) => getDefaultWorkshop(s.db));
  // Los mensajes se cuentan en su propio icono; la campana, el resto de avisos.
  const unread = useData(
    (s) => s.db.notifications.filter((n) => n.user_id === profile.id && !n.read_at && n.type !== "message").length,
  );
  const unreadMessages = useData((s) => countAllUnread(s.db, profile));

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-2 px-4">
        <Logo label={workshop.name} className="min-w-0 text-sm" />
        <div className="flex items-center gap-1">
          <DemoSwitcher />
          <Link
            href={routes.customerInbox()}
            className="relative grid size-10 place-items-center rounded-full hover:bg-muted"
            aria-label={unreadMessages > 0 ? `Mensajes (${unreadMessages} sin leer)` : "Mensajes"}
          >
            <MessageCircle className="size-5" aria-hidden />
            {unreadMessages > 0 && (
              <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                {unreadMessages}
              </span>
            )}
          </Link>
          <Link
            href="/app/notifications"
            className="relative grid size-10 place-items-center rounded-full hover:bg-muted"
            aria-label={unread > 0 ? `Avisos (${unread} sin leer)` : "Avisos"}
          >
            <Bell className="size-5" aria-hidden />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
                {unread}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur pb-safe"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-6", active && "stroke-[2.25]")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
