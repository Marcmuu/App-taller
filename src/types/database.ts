/**
 * Tipos de las tablas de la base de datos.
 *
 * Reflejan 1:1 el modelo de `02_MODELO_DATOS.md`. Mientras trabajamos con la
 * BBDD falsa (localStorage) estos tipos son la fuente de verdad; cuando
 * conectemos Supabase se sustituirán por los generados con
 * `supabase gen types typescript` y los nombres deberían coincidir.
 *
 * Convenciones: ids uuid como string, fechas timestamptz como ISO string,
 * numeric como number.
 */

export type UUID = string;
export type ISODateTime = string;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const USER_ROLES = ["customer", "workshop_admin", "mechanic"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const APPOINTMENT_STATUSES = [
  "requested",
  "confirmed",
  "cancelled",
  "completed",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const DRIVABLE_STATUSES = ["yes", "no", "unknown"] as const;
export type DrivableStatus = (typeof DRIVABLE_STATUSES)[number];

export const MEDIA_TYPES = ["image", "video"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const REPAIR_STATUSES = [
  "appointment_confirmed",
  "vehicle_received",
  "diagnosis",
  "estimate_pending",
  "repair_in_progress",
  "repair_completed",
  "ready_for_pickup",
  "closed",
] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const ESTIMATE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "question",
] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const ESTIMATE_ITEM_TYPES = ["work", "part", "labor"] as const;
export type EstimateItemType = (typeof ESTIMATE_ITEM_TYPES)[number];

// ---------------------------------------------------------------------------
// Tablas
// ---------------------------------------------------------------------------

export interface Workshop {
  id: UUID;
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  created_at: ISODateTime;
}

/** Relacionado 1:1 con auth.users (mismo id). */
export interface Profile {
  id: UUID;
  full_name: string;
  phone: string;
  role: UserRole;
  workshop_id: UUID | null;
  created_at: ISODateTime;
}

export interface Vehicle {
  id: UUID;
  customer_id: UUID;
  workshop_id: UUID | null;
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
  created_at: ISODateTime;
}

export interface Appointment {
  id: UUID;
  workshop_id: UUID;
  vehicle_id: UUID;
  customer_id: UUID;
  scheduled_at: ISODateTime;
  status: AppointmentStatus;
  issue_category: string | null;
  issue_description: string | null;
  drivable_status: DrivableStatus | null;
  created_at: ISODateTime;
}

export interface AppointmentMedia {
  id: UUID;
  appointment_id: UUID;
  uploaded_by: UUID;
  storage_path: string;
  media_type: MediaType;
  created_at: ISODateTime;
}

export interface RepairOrder {
  id: UUID;
  workshop_id: UUID;
  vehicle_id: UUID;
  customer_id: UUID;
  appointment_id: UUID | null;
  current_status: RepairStatus;
  opened_at: ISODateTime;
  completed_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface RepairStatusHistory {
  id: UUID;
  repair_order_id: UUID;
  from_status: RepairStatus | null;
  to_status: RepairStatus;
  changed_by: UUID;
  note: string | null;
  created_at: ISODateTime;
}

export interface Estimate {
  id: UUID;
  workshop_id: UUID;
  repair_order_id: UUID;
  status: EstimateStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  sent_at: ISODateTime | null;
  accepted_at: ISODateTime | null;
  rejected_at: ISODateTime | null;
  version: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface EstimateItem {
  id: UUID;
  estimate_id: UUID;
  type: EstimateItemType;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface Message {
  id: UUID;
  workshop_id: UUID;
  repair_order_id: UUID;
  sender_id: UUID;
  body: string;
  created_at: ISODateTime;
  read_at: ISODateTime | null;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  repair_order_id: UUID | null;
  type: string;
  title: string;
  body: string;
  read_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface WorkshopAvailability {
  id: UUID;
  workshop_id: UUID;
  /** 0 = domingo … 6 = sábado (igual que Date.getDay y Postgres extract(dow)). */
  weekday: number;
  /** "HH:mm" */
  start_time: string;
  /** "HH:mm" */
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
}

/** Conjunto de tablas. Es la forma de la BBDD falsa. */
export interface Database {
  workshops: Workshop[];
  profiles: Profile[];
  vehicles: Vehicle[];
  appointments: Appointment[];
  appointment_media: AppointmentMedia[];
  repair_orders: RepairOrder[];
  repair_status_history: RepairStatusHistory[];
  estimates: Estimate[];
  estimate_items: EstimateItem[];
  messages: Message[];
  notifications: Notification[];
  workshop_availability: WorkshopAvailability[];
}
