import type { Database, UUID } from "@/types/database";

/** Equivalente simplificado de auth.users de Supabase. */
export interface MockAuthUser {
  id: UUID;
  email: string;
  password: string;
}

/** Equivalente simplificado de un objeto de Supabase Storage. */
export interface StorageObject {
  url: string;
  mime_type: string;
}

export interface MockState {
  schema_version: number;
  db: Database;
  auth_users: MockAuthUser[];
  /** storage_path → objeto */
  storage: Record<string, StorageObject>;
  /**
   * Ocupación de franjas de todos los clientes (sin datos personales). Con
   * Supabase viene de la tabla booked_slots, porque cada cliente solo ve sus
   * propias citas. En la BBDD de prueba se calcula con las citas.
   */
  occupancy?: Array<{ workshop_id: string; scheduled_at: string }>;
}
