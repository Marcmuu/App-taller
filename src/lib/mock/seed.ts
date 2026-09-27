import { addDays, format, subMinutes } from "date-fns";
import { calculateEstimateTotals, lineTotal } from "@/lib/domain/estimate";
import type {
  Appointment,
  Database,
  Estimate,
  EstimateItem,
  EstimateItemType,
  Message,
  Notification,
  RepairOrder,
  RepairStatus,
  RepairStatusHistory,
  WorkshopAvailability,
} from "@/types/database";
import { asset } from "@/lib/routes";
import type { MockAuthUser, MockState, StorageObject } from "./types";

/**
 * Datos de demostración. Las fechas se calculan relativas al momento en que
 * se genera el seed para que el dashboard siempre parezca "de hoy".
 *
 * Los ids son uuids fijos y legibles para poder reutilizarlos en
 * `supabase/seed.sql` cuando conectemos la BBDD real.
 *
 * Escenarios incluidos:
 * - Una reparación en cada estado, incluido un presupuesto rechazado.
 * - Mañana (primer día laborable) a las 10:00 la franja está llena (2/2).
 * - El próximo sábado está completo (2 huecos, 2 citas).
 * - Un festivo dentro de ~9 días.
 * - Nuria: cliente recién registrada, sin coches (estados vacíos).
 */

export const DEMO_PASSWORD = "demo1234";

/** Súbelo cuando cambie la forma de los datos para regenerar el seed guardado. */
export const MOCK_SCHEMA_VERSION = 2;

/** uuid v4 válido y determinista: sid(2, 7) → 00000000-0000-4000-8002-000000000007 */
function sid(table: number, n: number): string {
  return `00000000-0000-4000-8${String(table).padStart(3, "0")}-${String(n).padStart(12, "0")}`;
}

export const IDS = {
  workshop: sid(1, 1),
  admin: sid(2, 1),
  mechanic1: sid(2, 2),
  mechanic2: sid(2, 3),
  carlos: sid(2, 11),
  ana: sid(2, 12),
  marta: sid(2, 13),
  david: sid(2, 14),
  lucia: sid(2, 15),
  sergio: sid(2, 16),
  jorge: sid(2, 17),
  nuria: sid(2, 18),
} as const;

export function createSeed(now: Date = new Date()): MockState {
  const at = (dayOffset: number, hhmm: string): string => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = addDays(now, dayOffset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const ago = (minutes: number): string => subMinutes(now, minutes).toISOString();
  const created = at(-60, "10:00");
  /** Desplazamiento (en días) del n-ésimo día laborable (L-V) a partir de mañana. */
  const weekday = (n: number): number => {
    let offset = 0;
    let found = 0;
    while (found < n) {
      offset++;
      const day = addDays(now, offset).getDay();
      if (day >= 1 && day <= 5) found++;
    }
    return offset;
  };
  /** Desplazamiento hasta el próximo día de la semana `dow` (mínimo mañana). */
  const next = (dow: number): number => {
    let offset = 1;
    while (addDays(now, offset).getDay() !== dow) offset++;
    return offset;
  };

  const W = IDS.workshop;
  const T1 = weekday(1); // primer día laborable a partir de mañana
  const T2 = weekday(2);
  const SAT = next(6);

  // -------------------------------------------------------------------------
  // Taller, usuarios y perfiles
  // -------------------------------------------------------------------------

  const workshops: Database["workshops"] = [
    {
      id: W,
      name: "Taller Martínez",
      slug: "taller-martinez",
      phone: "+34 912 345 678",
      email: "hola@tallermartinez.es",
      address: "Calle de la Industria 24, 28045 Madrid",
      created_at: created,
    },
  ];

  const people: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: Database["profiles"][number]["role"];
  }> = [
    { id: IDS.admin, name: "Laura Martínez", email: "laura@tallerdemo.es", phone: "+34 600 100 001", role: "workshop_admin" },
    { id: IDS.mechanic1, name: "Javier Ruiz", email: "javier@tallerdemo.es", phone: "+34 600 100 002", role: "mechanic" },
    { id: IDS.mechanic2, name: "Pablo Sánchez", email: "pablo@tallerdemo.es", phone: "+34 600 100 003", role: "mechanic" },
    { id: IDS.carlos, name: "Carlos López", email: "carlos@demo.es", phone: "+34 611 222 333", role: "customer" },
    { id: IDS.ana, name: "Ana García", email: "ana@demo.es", phone: "+34 622 333 444", role: "customer" },
    { id: IDS.marta, name: "Marta Fernández", email: "marta@demo.es", phone: "+34 633 444 555", role: "customer" },
    { id: IDS.david, name: "David Romero", email: "david@demo.es", phone: "+34 644 555 666", role: "customer" },
    { id: IDS.lucia, name: "Lucía Navarro", email: "lucia@demo.es", phone: "+34 655 666 777", role: "customer" },
    { id: IDS.sergio, name: "Sergio Gil", email: "sergio@demo.es", phone: "+34 666 777 888", role: "customer" },
    { id: IDS.jorge, name: "Jorge Díaz", email: "jorge@demo.es", phone: "+34 677 888 999", role: "customer" },
    { id: IDS.nuria, name: "Nuria Vidal", email: "nuria@demo.es", phone: "+34 688 999 000", role: "customer" },
  ];

  const profiles: Database["profiles"] = people.map((p) => ({
    id: p.id,
    full_name: p.name,
    phone: p.phone,
    role: p.role,
    workshop_id: p.role === "customer" ? null : W,
    created_at: p.id === IDS.nuria ? ago(20) : created,
  }));

  const auth_users: MockAuthUser[] = people.map((p) => ({
    id: p.id,
    email: p.email,
    password: DEMO_PASSWORD,
  }));

  // -------------------------------------------------------------------------
  // Vehículos
  // -------------------------------------------------------------------------

  const V = {
    leon: sid(3, 1),
    yaris: sid(3, 2),
    clio: sid(3, 3),
    c3: sid(3, 4),
    p308: sid(3, 5),
    focus: sid(3, 6),
    sportage: sid(3, 7),
    bmw: sid(3, 8),
    a3: sid(3, 9),
    polo: sid(3, 10),
    ibiza: sid(3, 11),
    i30: sid(3, 12),
  };

  const vehicles: Database["vehicles"] = [
    { id: V.leon, customer_id: IDS.carlos, make: "Seat", model: "León", license_plate: "1234 ABC", year: 2019 },
    { id: V.yaris, customer_id: IDS.carlos, make: "Toyota", model: "Yaris", license_plate: "5678 DEF", year: 2016 },
    { id: V.clio, customer_id: IDS.ana, make: "Renault", model: "Clio", license_plate: "4321 JKL", year: 2020 },
    { id: V.c3, customer_id: IDS.ana, make: "Citroën", model: "C3", license_plate: "7531 KMN", year: 2018 },
    { id: V.p308, customer_id: IDS.marta, make: "Peugeot", model: "308", license_plate: "9876 GHF", year: 2017 },
    { id: V.ibiza, customer_id: IDS.marta, make: "Seat", model: "Ibiza", license_plate: "1122 HJK", year: 2021 },
    { id: V.focus, customer_id: IDS.david, make: "Ford", model: "Focus", license_plate: "2468 LMN", year: 2015 },
    { id: V.sportage, customer_id: IDS.lucia, make: "Kia", model: "Sportage", license_plate: "1357 PRS", year: 2021 },
    { id: V.i30, customer_id: IDS.lucia, make: "Hyundai", model: "i30", license_plate: "7788 JKM", year: 2019 },
    { id: V.bmw, customer_id: IDS.sergio, make: "BMW", model: "Serie 1", license_plate: "8642 TVW", year: 2019 },
    { id: V.a3, customer_id: IDS.jorge, make: "Audi", model: "A3", license_plate: "3698 BCD", year: 2018 },
    { id: V.polo, customer_id: IDS.jorge, make: "Volkswagen", model: "Polo", license_plate: "5566 FGH", year: 2017 },
  ].map((v) => ({ ...v, workshop_id: W, vin: null, created_at: created }));

  // -------------------------------------------------------------------------
  // Citas
  // -------------------------------------------------------------------------

  const A = {
    leon: sid(4, 1),
    clio: sid(4, 2),
    p308: sid(4, 3),
    focus: sid(4, 4),
    sportage: sid(4, 5),
    bmw: sid(4, 6),
    a3: sid(4, 7),
    c3Request: sid(4, 8),
    yarisOld: sid(4, 9),
    polo: sid(4, 10),
    ibiza: sid(4, 11),
    i30: sid(4, 12),
  };

  const appt = (
    id: string,
    vehicleId: string,
    customerId: string,
    scheduledAt: string,
    status: Appointment["status"],
    category: string,
    description: string,
    drivable: Appointment["drivable_status"],
    createdAt: string,
  ): Appointment => ({
    id,
    workshop_id: W,
    vehicle_id: vehicleId,
    customer_id: customerId,
    scheduled_at: scheduledAt,
    status,
    issue_category: category,
    issue_description: description,
    drivable_status: drivable,
    created_at: createdAt,
  });

  const appointments: Appointment[] = [
    appt(A.leon, V.leon, IDS.carlos, at(-1, "09:00"), "completed", "testigo",
      "Se ha encendido el testigo del motor y pierde potencia al acelerar en autovía. Desde: Hace unos días.", "yes", at(-3, "18:40")),
    appt(A.clio, V.clio, IDS.ana, at(-2, "10:00"), "completed", "ruido",
      "Ruido metálico al frenar, sobre todo en ciudad. Desde: Hace semanas.", "yes", at(-4, "12:10")),
    appt(A.p308, V.p308, IDS.marta, at(-3, "08:30"), "completed", "mantenimiento",
      "Revisión anual: aceite, filtros y revisar niveles. Desde: Hoy.", "yes", at(-6, "09:00")),
    appt(A.focus, V.focus, IDS.david, at(-1, "11:00"), "completed", "averia",
      "Tarda mucho en arrancar por las mañanas y a veces no arranca a la primera. Desde: Hace semanas.", "yes", at(-3, "20:15")),
    appt(A.sportage, V.sportage, IDS.lucia, at(0, "08:30"), "completed", "testigo",
      "Se ha encendido el testigo del ABS. Desde: Hoy.", "unknown", at(-1, "10:05")),
    appt(A.bmw, V.bmw, IDS.sergio, at(0, "09:30"), "completed", "mantenimiento",
      "Revisión de los 60.000 km. Desde: Hoy.", "yes", at(-5, "17:30")),
    appt(A.a3, V.a3, IDS.jorge, at(-2, "15:30"), "completed", "averia",
      "El aire acondicionado no enfría. Desde: Hace semanas.", "yes", at(-5, "11:20")),
    appt(A.yarisOld, V.yaris, IDS.carlos, at(-35, "09:00"), "completed", "mantenimiento",
      "Cambio de aceite y filtros. Desde: Hoy.", "yes", at(-38, "19:00")),
    // Mañana 10:00: franja llena (capacidad 2) → una confirmada + una solicitada
    appt(A.polo, V.polo, IDS.jorge, at(T1, "10:00"), "confirmed", "mantenimiento",
      "Cambio de ruedas delanteras. Desde: Hoy.", "yes", at(-2, "12:00")),
    appt(A.c3Request, V.c3, IDS.ana, at(T1, "10:00"), "requested", "ruido",
      "Chirría la correa al arrancar en frío. Desde: Hace unos días.", "yes", ago(95)),
    // Próximo sábado completo (09:00 y 09:30, capacidad 1)
    appt(A.i30, V.i30, IDS.lucia, at(SAT, "09:00"), "confirmed", "mantenimiento",
      "Revisión antes de un viaje largo. Desde: Hoy.", "yes", at(-3, "16:00")),
    appt(A.ibiza, V.ibiza, IDS.marta, at(SAT, "09:30"), "confirmed", "otro",
      "Pasar la pre-ITV. Desde: Hoy.", "yes", at(-1, "18:30")),
  ];

  // -------------------------------------------------------------------------
  // Multimedia (en Supabase Storage: bucket repair-media)
  // -------------------------------------------------------------------------

  const storage: Record<string, StorageObject> = {};
  const appointment_media: Database["appointment_media"] = [];
  const addMedia = (n: number, appointmentId: string, by: string, file: string, createdAt: string) => {
    const path = `${W}/appointments/${appointmentId}/${sid(5, n)}.svg`;
    storage[path] = { url: asset(`/mock/${file}`), mime_type: "image/svg+xml" };
    appointment_media.push({
      id: sid(5, n),
      appointment_id: appointmentId,
      uploaded_by: by,
      storage_path: path,
      media_type: "image",
      created_at: createdAt,
    });
  };
  addMedia(1, A.leon, IDS.carlos, "testigo-motor.svg", at(-3, "18:41"));
  addMedia(2, A.leon, IDS.carlos, "salpicadero.svg", at(-3, "18:41"));
  addMedia(3, A.sportage, IDS.lucia, "testigo-abs.svg", at(-1, "10:06"));
  addMedia(4, A.c3Request, IDS.ana, "correa.svg", ago(94));

  // -------------------------------------------------------------------------
  // Reparaciones + historial
  // -------------------------------------------------------------------------

  const R = {
    leon: sid(6, 1),
    clio: sid(6, 2),
    p308: sid(6, 3),
    focus: sid(6, 4),
    sportage: sid(6, 5),
    bmw: sid(6, 6),
    a3: sid(6, 7),
    yarisOld: sid(6, 8),
    polo: sid(6, 9),
    i30: sid(6, 10),
    ibiza: sid(6, 11),
  };

  const ESTIMATED = {
    leon: at(T2, "19:00"),
    clio: at(T1, "18:00"),
    p308: at(0, "13:00"),
    a3: at(0, "19:00"),
  };

  const repair_orders: RepairOrder[] = [];
  const repair_status_history: RepairStatusHistory[] = [];
  let historyN = 0;

  const repair = (
    id: string,
    appointmentId: string,
    vehicleId: string,
    customerId: string,
    steps: Array<[RepairStatus, string, string, string?]>,
    estimatedReadyAt: string | null = null,
  ) => {
    let from: RepairStatus | null = null;
    for (const [to, when, by, note] of steps) {
      repair_status_history.push({
        id: sid(7, ++historyN),
        repair_order_id: id,
        from_status: from,
        to_status: to,
        changed_by: by,
        note: note ?? null,
        created_at: when,
      });
      from = to;
    }
    const first = steps[0][1];
    const last = steps[steps.length - 1];
    const completed = steps.find(([s]) => s === "repair_completed");
    repair_orders.push({
      id,
      workshop_id: W,
      vehicle_id: vehicleId,
      customer_id: customerId,
      appointment_id: appointmentId,
      current_status: last[0],
      opened_at: first,
      completed_at: completed ? completed[1] : null,
      estimated_ready_at: estimatedReadyAt,
      created_at: first,
      updated_at: last[1],
    });
  };

  const { admin: L, mechanic1: J, mechanic2: P } = IDS;

  repair(R.leon, A.leon, V.leon, IDS.carlos, [
    ["appointment_confirmed", at(-3, "19:02"), L],
    ["vehicle_received", at(-1, "09:04"), J],
    ["diagnosis", at(-1, "10:30"), J],
    ["estimate_pending", ago(40), L],
  ], ESTIMATED.leon);
  repair(R.clio, A.clio, V.clio, IDS.ana, [
    ["appointment_confirmed", at(-4, "12:30"), L],
    ["vehicle_received", at(-2, "10:02"), P],
    ["diagnosis", at(-2, "11:15"), P],
    ["estimate_pending", at(-2, "13:40"), L],
    ["repair_in_progress", at(-1, "09:10"), P],
  ], ESTIMATED.clio);
  repair(R.p308, A.p308, V.p308, IDS.marta, [
    ["appointment_confirmed", at(-6, "09:20"), L],
    ["vehicle_received", at(-3, "08:35"), J],
    ["diagnosis", at(-3, "09:00"), J],
    ["estimate_pending", at(-3, "10:10"), L],
    ["repair_in_progress", at(-3, "12:00"), J],
    ["repair_completed", ago(180), J],
    ["ready_for_pickup", ago(150), L],
  ], ESTIMATED.p308);
  repair(R.focus, A.focus, V.focus, IDS.david, [
    ["appointment_confirmed", at(-3, "20:40"), L],
    ["vehicle_received", at(-1, "11:05"), P],
    ["diagnosis", at(-1, "12:00"), P],
    ["estimate_pending", at(-1, "17:20"), L],
  ]);
  repair(R.sportage, A.sportage, V.sportage, IDS.lucia, [
    ["appointment_confirmed", at(-1, "10:30"), L],
    ["vehicle_received", ago(110), J],
    ["diagnosis", ago(25), J],
  ]);
  repair(R.bmw, A.bmw, V.bmw, IDS.sergio, [
    ["appointment_confirmed", at(-5, "18:00"), L],
    ["vehicle_received", ago(45), P],
  ]);
  repair(R.a3, A.a3, V.a3, IDS.jorge, [
    ["appointment_confirmed", at(-5, "11:45"), L],
    ["vehicle_received", at(-2, "15:35"), P],
    ["diagnosis", at(-2, "16:00"), P],
    ["estimate_pending", at(-2, "17:30"), L],
    ["repair_in_progress", at(-1, "09:00"), P],
    ["repair_completed", ago(30), P],
  ], ESTIMATED.a3);
  repair(R.yarisOld, A.yarisOld, V.yaris, IDS.carlos, [
    ["appointment_confirmed", at(-38, "19:30"), L],
    ["vehicle_received", at(-35, "09:05"), J],
    ["diagnosis", at(-35, "09:30"), J],
    ["estimate_pending", at(-35, "10:00"), L],
    ["repair_in_progress", at(-35, "11:00"), J],
    ["repair_completed", at(-35, "13:00"), J],
    ["ready_for_pickup", at(-35, "13:05"), L],
    ["closed", at(-35, "18:30"), L],
  ]);
  repair(R.polo, A.polo, V.polo, IDS.jorge, [["appointment_confirmed", at(-2, "12:30"), L]]);
  repair(R.i30, A.i30, V.i30, IDS.lucia, [["appointment_confirmed", at(-3, "16:20"), J]]);
  repair(R.ibiza, A.ibiza, V.ibiza, IDS.marta, [["appointment_confirmed", at(-1, "19:00"), L]]);

  // -------------------------------------------------------------------------
  // Presupuestos
  // -------------------------------------------------------------------------

  const estimates: Estimate[] = [];
  const estimate_items: EstimateItem[] = [];
  let itemN = 0;

  const estimate = (
    n: number,
    repairId: string,
    status: Estimate["status"],
    sentAt: string,
    answeredAt: string | null,
    estimatedReadyAt: string | null,
    items: Array<[EstimateItemType, string, number, number]>,
  ) => {
    const id = sid(8, n);
    const lines = items.map(([type, description, quantity, unit_price], i) => ({
      id: sid(9, ++itemN),
      estimate_id: id,
      type,
      description,
      quantity,
      unit_price,
      total: lineTotal({ quantity, unit_price }),
      sort_order: i,
    }));
    estimate_items.push(...lines);
    estimates.push({
      id,
      workshop_id: W,
      repair_order_id: repairId,
      status,
      ...calculateEstimateTotals(lines, 21),
      sent_at: sentAt,
      accepted_at: status === "accepted" ? answeredAt : null,
      rejected_at: status === "rejected" ? answeredAt : null,
      estimated_ready_at: estimatedReadyAt,
      version: 1,
      created_at: sentAt,
      updated_at: answeredAt ?? sentAt,
    });
  };

  estimate(1, R.leon, "sent", ago(40), null, ESTIMATED.leon, [
    ["work", "Diagnosis electrónica", 1, 45],
    ["part", "Bobina de encendido (cilindro 3)", 1, 89.5],
    ["part", "Juego de bujías", 4, 12.9],
    ["labor", "Mano de obra (horas)", 1.5, 48],
  ]);
  estimate(2, R.clio, "accepted", at(-2, "13:40"), at(-2, "16:20"), ESTIMATED.clio, [
    ["work", "Revisión del sistema de frenos", 1, 20],
    ["part", "Pastillas de freno delanteras", 1, 65],
    ["part", "Discos de freno delanteros", 2, 55],
    ["labor", "Mano de obra (horas)", 2, 48],
  ]);
  estimate(3, R.p308, "accepted", at(-3, "10:10"), at(-3, "11:40"), ESTIMATED.p308, [
    ["work", "Revisión anual completa", 1, 35],
    ["part", "Aceite 5W30 (litros)", 5, 11],
    ["part", "Filtro de aceite", 1, 14.5],
    ["part", "Filtro de aire", 1, 19.9],
    ["labor", "Mano de obra (horas)", 1, 48],
  ]);
  estimate(4, R.a3, "accepted", at(-2, "17:30"), at(-2, "18:05"), ESTIMATED.a3, [
    ["work", "Carga de gas del aire acondicionado", 1, 60],
    ["part", "Válvula de expansión", 1, 78],
    ["labor", "Mano de obra (horas)", 2.5, 48],
  ]);
  estimate(5, R.yarisOld, "accepted", at(-35, "10:00"), at(-35, "10:25"), null, [
    ["part", "Aceite 5W30 (litros)", 4, 11],
    ["part", "Filtro de aceite", 1, 12],
    ["labor", "Mano de obra (horas)", 0.5, 48],
  ]);
  estimate(6, R.focus, "rejected", at(-1, "17:20"), ago(200), at(T1, "19:00"), [
    ["work", "Diagnosis del sistema de arranque", 1, 45],
    ["part", "Motor de arranque", 1, 245],
    ["part", "Batería 70Ah", 1, 118],
    ["labor", "Mano de obra (horas)", 2, 48],
  ]);

  // -------------------------------------------------------------------------
  // Mensajes
  // -------------------------------------------------------------------------

  let msgN = 0;
  const msg = (repairId: string, sender: string, body: string, createdAt: string, read: boolean): Message => ({
    id: sid(10, ++msgN),
    workshop_id: W,
    repair_order_id: repairId,
    sender_id: sender,
    body,
    created_at: createdAt,
    read_at: read ? createdAt : null,
  });

  const messages: Message[] = [
    msg(R.leon, J, "Hola Carlos, ya tenemos el coche. Esta mañana le pasamos la diagnosis.", at(-1, "09:10"), true),
    msg(R.leon, IDS.carlos, "Perfecto, gracias. ¿Es grave?", at(-1, "09:30"), true),
    msg(R.leon, L, "Nada grave: es una bobina de encendido. Te acabamos de enviar el presupuesto para que lo revises.", ago(38), false),
    msg(R.clio, IDS.ana, "Hola, ¿lo tendréis para el viernes? Lo necesito para un viaje.", at(-1, "12:00"), true),
    msg(R.clio, P, "Sí, sin problema. Si todo va bien lo tendrás antes de lo previsto.", at(-1, "12:20"), true),
    msg(R.clio, IDS.ana, "¡Genial, muchas gracias!", ago(70), false),
    msg(R.p308, L, "Marta, tu Peugeot ya está listo. Puedes pasar hasta las 13:00.", ago(150), true),
    msg(R.focus, IDS.david, "Me parece caro, prefiero pensarlo unos días.", ago(199), false),
  ];

  // -------------------------------------------------------------------------
  // Notificaciones
  // -------------------------------------------------------------------------

  let notifN = 0;
  const notif = (
    userId: string,
    repairId: string | null,
    type: string,
    title: string,
    body: string,
    createdAt: string,
    read: boolean,
  ): Notification => ({
    id: sid(11, ++notifN),
    user_id: userId,
    repair_order_id: repairId,
    type,
    title,
    body,
    read_at: read ? createdAt : null,
    created_at: createdAt,
  });

  const staff = [L, J, P];
  const notifications: Notification[] = [
    notif(IDS.carlos, R.leon, "status_changed", "Diagnóstico iniciado", "Estamos revisando tu Seat León.", at(-1, "10:30"), true),
    notif(IDS.carlos, R.leon, "estimate_sent", "Tienes un presupuesto", "Revisa el presupuesto de tu Seat León.", ago(40), false),
    notif(IDS.marta, R.p308, "status_changed", "¡Listo para recoger!", "Ya puedes pasar a recoger tu Peugeot 308.", ago(150), false),
    notif(IDS.jorge, R.a3, "status_changed", "Reparación terminada", "La reparación de tu Audi A3 ha terminado.", ago(30), false),
    ...staff.map((s) =>
      notif(s, R.focus, "estimate_rejected", "Presupuesto rechazado", "David Romero no quiere realizar la reparación · Ford Focus", ago(200), true),
    ),
    ...staff.map((s) =>
      notif(s, null, "appointment_requested", "Nueva solicitud de cita", "Ana García · Citroën C3 · Ruido extraño", ago(95), false),
    ),
    ...staff.map((s) =>
      notif(s, R.clio, "message", "Nuevo mensaje de Ana García", "¡Genial, muchas gracias!", ago(70), false),
    ),
  ];

  // -------------------------------------------------------------------------
  // Horario: L-V 8:30–13:30 (2 coches por franja) y 15:30–18:30 (1 coche),
  // sábados 9:00–10:00 (1 coche). Domingo cerrado. Franjas de 30 min.
  // -------------------------------------------------------------------------

  let availN = 0;
  const workshop_availability: WorkshopAvailability[] = [];
  const addRange = (weekdayNum: number, start: string, end: string, capacity: number) =>
    workshop_availability.push({
      id: sid(12, ++availN),
      workshop_id: W,
      weekday: weekdayNum,
      start_time: start,
      end_time: end,
      slot_minutes: 30,
      capacity,
      is_active: true,
    });
  for (const d of [1, 2, 3, 4, 5]) {
    addRange(d, "08:30", "13:30", 2);
    addRange(d, "15:30", "18:30", 1);
  }
  addRange(6, "09:00", "10:00", 1);

  const workshop_closures: Database["workshop_closures"] = [
    {
      id: sid(13, 1),
      workshop_id: W,
      date: format(addDays(now, weekday(7)), "yyyy-MM-dd"),
      reason: "Festivo local",
      created_at: created,
    },
  ];

  return {
    schema_version: MOCK_SCHEMA_VERSION,
    db: {
      workshops,
      profiles,
      vehicles,
      appointments,
      appointment_media,
      repair_orders,
      repair_status_history,
      estimates,
      estimate_items,
      messages,
      notifications,
      workshop_availability,
      workshop_closures,
    },
    auth_users,
    storage,
  };
}
