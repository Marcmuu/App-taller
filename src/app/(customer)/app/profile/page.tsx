"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getDefaultWorkshop } from "@/lib/data/queries";
import { initials } from "@/lib/format";

export default function ProfilePage() {
  const router = useRouter();
  const profile = useRequiredProfile();
  const email = profile.email;
  const workshop = useData((s) => getDefaultWorkshop(s.db));

  return (
    <div className="space-y-6 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>

      <section className="flex items-center gap-4 rounded-2xl border bg-card p-5">
        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {initials(profile.full_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          <p className="text-sm text-muted-foreground">{profile.phone}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Tu taller</h2>
        <div className="divide-y rounded-2xl border bg-card">
          <p className="p-4 font-semibold">{workshop.name}</p>
          <Link href={routes.customerGeneralChat()} className="flex items-center gap-3 p-4 font-medium text-primary hover:bg-muted/40">
            <MessageCircle className="size-5" aria-hidden /> Escribir al taller
          </Link>
          <a href={`tel:${workshop.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 p-4 hover:bg-muted/40">
            <Phone className="size-5 text-muted-foreground" aria-hidden /> {workshop.phone}
          </a>
          <a href={`mailto:${workshop.email}`} className="flex items-center gap-3 p-4 hover:bg-muted/40">
            <Mail className="size-5 text-muted-foreground" aria-hidden /> {workshop.email}
          </a>
          <p className="flex items-center gap-3 p-4">
            <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden /> {workshop.address}
          </p>
        </div>
      </section>

      <Button
        variant="outline"
        size="xl"
        className="w-full"
        onClick={async () => {
          await signOut();
          router.replace("/");
        }}
      >
        <LogOut aria-hidden /> Cerrar sesión
      </Button>
    </div>
  );
}
