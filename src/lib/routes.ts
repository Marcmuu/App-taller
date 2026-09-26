/**
 * Todas las URLs con id de la app, en un solo sitio.
 *
 * Usamos parámetros de consulta (`?id=`) en lugar de segmentos dinámicos
 * (`/repairs/[id]`) para que la demo se pueda exportar como web estática
 * (GitHub Pages): los ids se crean en el navegador y no se conocen al
 * compilar. Cuando la app corra en un servidor (Vercel + Supabase) se puede
 * volver a `/app/repairs/[id]` cambiando solo este archivo y las carpetas.
 */
export const routes = {
  customerRepair: (repairId: string) => `/app/repair?id=${repairId}`,
  customerMessages: (repairId: string) => `/app/repair/messages?id=${repairId}`,
  customerPickup: (repairId: string) => `/app/repair/pickup?id=${repairId}`,
  customerEstimate: (estimateId: string) => `/app/estimate?id=${estimateId}`,
  workshopRepair: (repairId: string) => `/taller/vehicle?id=${repairId}`,
  workshopEstimate: (estimateId: string) => `/taller/estimate?id=${estimateId}`,
  workshopConversation: (repairId: string) => `/taller/communications?repair=${repairId}`,
} as const;

/**
 * Ruta a un archivo de /public respetando el basePath (GitHub Pages sirve la
 * web en /<repo>/). Los <Link> y router.push ya lo añaden solos.
 */
export function asset(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
