"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/data/hooks";

/** Si ya hay sesión en esta pestaña, lleva directamente a su área. */
export function SessionRedirect() {
  const router = useRouter();
  const profile = useCurrentProfile();

  useEffect(() => {
    if (profile) router.replace(profile.role === "customer" ? "/app" : "/taller");
  }, [profile, router]);

  return null;
}
