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
}
