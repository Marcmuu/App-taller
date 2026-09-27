import { z } from "zod";
import {
  DRIVABLE_STATUSES,
  ESTIMATE_ITEM_TYPES,
} from "@/types/database";
import { ISSUE_CATEGORIES } from "@/lib/domain/appointments";
import { validatePlate } from "@/lib/domain/plates";

export const loginSchema = z.object({
  email: z.email("Escribe un email válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  full_name: z.string().trim().min(3, "Escribe tu nombre y apellido"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s]{9,15}$/, "Escribe un teléfono válido"),
  email: z.email("Escribe un email válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});
export type SignupInput = z.infer<typeof signupSchema>;

const currentYear = new Date().getFullYear();

export const vehicleSchema = z
  .object({
    plate_format: z.string().min(1),
    license_plate: z.string().trim().max(15, "Matrícula demasiado larga"),
    make: z.string().trim().min(2, "Escribe la marca"),
    model: z.string().trim().min(1, "Escribe el modelo"),
    year: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 1950 && v <= currentYear + 1), {
        message: "Año no válido",
      }),
  })
  // La matrícula tiene que cumplir el formato del país elegido; se guarda normalizada.
  .superRefine((v, ctx) => {
    const check = validatePlate(v.license_plate, v.plate_format);
    if (!check.ok) ctx.addIssue({ code: "custom", path: ["license_plate"], message: check.error });
  })
  .transform((v) => {
    const check = validatePlate(v.license_plate, v.plate_format);
    return { ...v, license_plate: check.ok ? check.plate : v.license_plate };
  });
export type VehicleFormValues = z.input<typeof vehicleSchema>;
export type VehicleInput = z.output<typeof vehicleSchema>;

const issueCategoryValues = ISSUE_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const appointmentRequestSchema = z.object({
  vehicle_id: z.string().min(1, "Elige un vehículo"),
  issue_category: z.enum(issueCategoryValues, "Elige un motivo"),
  issue_description: z.string().trim().max(1000, "Máximo 1000 caracteres"),
  since: z.string().optional(),
  drivable_status: z.enum(DRIVABLE_STATUSES, "Indica si se puede conducir"),
  scheduled_at: z.iso.datetime({ offset: true, message: "Elige fecha y hora" }),
});
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;

export const estimateItemSchema = z.object({
  type: z.enum(ESTIMATE_ITEM_TYPES),
  description: z.string().trim().min(1, "Describe la línea"),
  quantity: z.number("Cantidad").positive("Mayor que 0"),
  unit_price: z.number("Precio").min(0, "No puede ser negativo"),
});

export const estimateFormSchema = z.object({
  items: z.array(estimateItemSchema).min(1, "Añade al menos una línea"),
  tax_rate: z.number("IVA").min(0).max(100),
  /** Fecha orientativa de entrega (ISO) o null si no se indica. */
  estimated_ready_at: z.string().nullable(),
});
export type EstimateFormInput = z.infer<typeof estimateFormSchema>;

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000, "Mensaje demasiado largo"),
});

// ---------------------------------------------------------------------------
// Multimedia
// ---------------------------------------------------------------------------

export const MEDIA_RULES = {
  image: { mime: ["image/jpeg", "image/png", "image/webp", "image/heic"], maxMb: 10 },
  video: { mime: ["video/mp4", "video/quicktime", "video/webm"], maxMb: 50 },
  /** Límite extra de la BBDD falsa (localStorage). Desaparece con Supabase Storage. */
  mockVideoMaxMb: 2,
  maxFiles: 6,
} as const;
