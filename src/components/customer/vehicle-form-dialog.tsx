"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addVehicle } from "@/lib/data/actions";
import {
  vehicleSchema,
  type VehicleFormValues,
  type VehicleInput,
} from "@/lib/validators";

export function VehicleFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (vehicleId: string) => void;
}) {
  const form = useForm<VehicleFormValues, unknown, VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { license_plate: "", make: "", model: "", year: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const id = await addVehicle(values);
      toast.success("Vehículo añadido");
      form.reset();
      onOpenChange(false);
      onCreated?.(id);
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "No se pudo guardar" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir vehículo</DialogTitle>
          <DialogDescription>Con estos datos el taller identificará tu coche.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Matrícula" error={errors.license_plate?.message} htmlFor="plate">
            <Input
              id="plate"
              placeholder="1234 ABC"
              autoCapitalize="characters"
              className="h-12 text-base uppercase"
              aria-invalid={!!errors.license_plate}
              {...form.register("license_plate")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" error={errors.make?.message} htmlFor="make">
              <Input id="make" placeholder="Seat" className="h-12 text-base" aria-invalid={!!errors.make} {...form.register("make")} />
            </Field>
            <Field label="Modelo" error={errors.model?.message} htmlFor="model">
              <Input id="model" placeholder="León" className="h-12 text-base" aria-invalid={!!errors.model} {...form.register("model")} />
            </Field>
          </div>
          <Field label="Año (opcional)" error={errors.year?.message} htmlFor="year">
            <Input
              id="year"
              inputMode="numeric"
              placeholder="2019"
              className="h-12 text-base"
              aria-invalid={!!errors.year}
              {...form.register("year")}
            />
          </Field>
          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            Guardar vehículo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
