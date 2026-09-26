"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/data/actions";
import { useMockState } from "@/lib/data/hooks";
import { DEMO_PASSWORD } from "@/lib/mock/seed";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { initials } from "@/lib/format";

export function LoginForm() {
  const router = useRouter();
  const area = useSearchParams().get("tipo") === "cliente" ? "customer" : "workshop";
  const state = useMockState();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const profile = await signIn(values.email, values.password);
      router.replace(profile.role === "customer" ? "/app" : "/taller");
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "No se pudo entrar" });
    }
  });

  const demoAccounts =
    state?.auth_users.flatMap((u) => {
      const profile = state.db.profiles.find((p) => p.id === u.id);
      if (!profile) return [];
      const isStaff = profile.role !== "customer";
      if ((area === "workshop") !== isStaff) return [];
      return [{ email: u.email, profile }];
    }) ?? [];

  const fillDemo = (email: string) => {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", DEMO_PASSWORD, { shouldValidate: true });
    void onSubmit();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Logo label="Taller Martínez" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {area === "customer" ? "Entra para ver tu coche" : "Acceso del taller"}
        </h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="h-12 text-base"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => toast.info("En la versión real te enviaremos un email para cambiarla.")}
            >
              ¿La has olvidado?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-12 text-base"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        {errors.root && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Entrar
        </Button>
      </form>

      {demoAccounts.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-dashed p-4">
          <div>
            <p className="text-sm font-medium">Cuentas de prueba</p>
            <p className="text-xs text-muted-foreground">Contraseña: {DEMO_PASSWORD}</p>
          </div>
          <ul className="grid gap-1">
            {demoAccounts.map(({ email, profile }) => (
              <li key={email}>
                <button
                  type="button"
                  onClick={() => fillDemo(email)}
                  disabled={isSubmitting}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted disabled:opacity-50"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(profile.full_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{profile.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{email}</span>
                  </span>
                  {profile.role !== "customer" && (
                    <span className="text-xs text-muted-foreground">
                      {profile.role === "workshop_admin" ? "Admin" : "Mecánico"}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
