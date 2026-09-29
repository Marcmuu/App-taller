"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, CarFront, LogOut, MessagesSquare, QrCode, Settings2, Store } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthGuard, DataGate, FullPageLoader } from "@/components/shared/guards";
import { DemoSwitcher } from "@/components/shared/demo-switcher";
import { LiveNotifier } from "@/components/shared/live-notifier";
import { usePushMenuItem } from "@/components/shared/push-settings";
import { markNotificationsRead, signOut } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getNotifications, getWorkshop } from "@/lib/data/queries";
import { formatRelative, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workshopNotificationHref } from "@/lib/notification-links";

export function WorkshopShell({ children }: { children: React.ReactNode }) {
  return (
    <DataGate>
      <AuthGuard area="workshop">
        <Shell>{children}</Shell>
      </AuthGuard>
    </DataGate>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname().replace(/(.)\/$/, "$1"); // sin barra final (trailingSlash)
  const profile = useRequiredProfile();
  const workshop = useData((s) => getWorkshop(s.db, profile.workshop_id));
  const unreadMessages = useData(
    (s) =>
      s.db.messages.filter((m) => {
        if (m.workshop_id !== profile.workshop_id || m.read_at) return false;
        return s.db.profiles.find((p) => p.id === m.sender_id)?.role === "customer";
      }).length,
  );

  const nav = [
    { href: "/taller", label: "Vehículos", icon: CarFront, active: pathname === "/taller" || pathname.startsWith("/taller/vehicle") || pathname.startsWith("/taller/estimate"), badge: 0 },
    { href: "/taller/calendar", label: "Calendario", icon: CalendarDays, active: pathname.startsWith("/taller/calendar"), badge: 0 },
    { href: "/taller/communications", label: "Comunicaciones", icon: MessagesSquare, active: pathname.startsWith("/taller/communications"), badge: unreadMessages },
    { href: "/taller/settings", label: "Horario", icon: Settings2, active: pathname.startsWith("/taller/settings"), badge: 0 },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40 print:bg-white">
      <LiveNotifier />
      <header className="sticky top-0 z-30 border-b print:hidden bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/taller" className="min-w-0 shrink">
            <Logo label={workshop?.name ?? "Taller"} className="text-sm sm:text-base" labelClassName="hidden sm:inline" />
          </Link>
          <nav className="ml-2 flex items-center gap-1" aria-label="Secciones">
            {nav.map(({ href, label, icon: Icon, active, badge }) => (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden md:inline">{label}</span>
                {badge > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-5 text-white">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <DemoSwitcher className="hidden md:inline-flex" />
            <NotificationsMenu />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 print:p-0">
        <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
      </main>
    </div>
  );
}

function NotificationsMenu() {
  const profile = useRequiredProfile();
  const notifications = useData((s) => getNotifications(s.db, profile.id).slice(0, 8));
  const unread = useData((s) => s.db.notifications.filter((n) => n.user_id === profile.id && !n.read_at).length);

  return (
    <DropdownMenu onOpenChange={(open) => !open && markNotificationsRead()}>
      <DropdownMenuTrigger
        className="relative grid size-10 place-items-center rounded-full hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={unread > 0 ? `Avisos (${unread} sin leer)` : "Avisos"}
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Avisos</DropdownMenuLabel>
        {notifications.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Sin avisos</p>}
        {notifications.map((n) => (
          <DropdownMenuItem key={n.id} asChild className="items-start">
            <Link href={workshopNotificationHref(n)}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
              <span className="min-w-0">
                <span className={cn("block text-sm", !n.read_at && "font-semibold")}>{n.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                <span className="block text-[11px] text-muted-foreground">{formatRelative(n.created_at)}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const router = useRouter();
  const profile = useRequiredProfile();
  const pushItem = usePushMenuItem();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Menú de usuario"
      >
        {initials(profile.full_name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block">{profile.full_name}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {profile.role === "workshop_admin" ? "Administrador" : "Mecánico"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/taller/negocio">
            <Store aria-hidden /> Mi taller
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/taller/negocio#tarjetas">
            <QrCode aria-hidden /> Tarjetas QR
          </Link>
        </DropdownMenuItem>
        {pushItem && (
          <DropdownMenuItem disabled={pushItem.disabled} onSelect={() => void pushItem.run()}>
            <pushItem.icon aria-hidden /> {pushItem.label}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          <LogOut aria-hidden /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
