"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/data/actions";
import { signupSchema, type SignupInput } from "@/lib/validators";

const FIELDS: Array<{
  name: keyof SignupInput;
  label: string;
  type: string;
  autoComplete: string;
  inputMode?: "email" | "tel";
  placeholder?: string;
}> = [
  { name: "full_name", label: "Nombre y apellidos", type: "text", autoComplete: "name", placeholder: "Nuria Vidal" },
  { name: "phone", label: "Teléfono", type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "600 000 000" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email" },
  { name: "password", label: "Contraseña", type: "password", autoComplete: "new-password", placeholder: "Mínimo 8 caracteres" },
];

export function SignupForm() {
  const router = useRouter();
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", phone: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp(values);
      toast.success("¡Cuenta creada! Ahora añade tu coche.");
      router.replace("/app");
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "No se pudo crear la cuenta" });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {FIELDS.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            inputMode={field.inputMode}
            placeholder={field.placeholder}
            className="h-12 text-base"
            aria-invalid={!!errors[field.name]}
            {...form.register(field.name)}
          />
          {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]?.message}</p>}
        </div>
      ))}
      {errors.root && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        Crear cuenta
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login?tipo=cliente" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
