/**
 * Formatos de matrícula admitidos. Cada uno valida el patrón oficial y
 * devuelve la matrícula normalizada (mayúsculas y separadores correctos).
 *
 * España (desde 2000): 4 números + 3 consonantes. No se usan vocales, ni Ñ,
 * ni Q, para evitar palabras y confusiones con 0/O.
 */

export interface PlateFormat {
  id: string;
  label: string;
  example: string;
  /** Explicación corta para el mensaje de error. */
  rule: string;
  /** Devuelve la matrícula normalizada o null si no cumple el formato. */
  parse: (raw: string) => string | null;
}

const compact = (raw: string) => raw.toUpperCase().replace(/[\s.\-·]/g, "");

const SPANISH_LETTERS = "BCDFGHJKLMNPRSTVWXYZ";

/** Códigos provinciales del sistema anterior a 2000 (una o dos letras). */
const SPANISH_PROVINCES = new Set(
  "A AB AL AV B BA BI BU C CA CC CE CO CR CS CU GC GE GI GR GU H HU IB J L LE LO LU M MA ML MU NA O OR OU P PM PO S SA SE SG SO SS T TE TF TO V VA VI Z ZA".split(" "),
);

export const PLATE_FORMATS: PlateFormat[] = [
  {
    id: "es",
    label: "España",
    example: "1234 BCD",
    rule: "4 números y 3 letras sin vocales (p. ej. 1234 BCD)",
    parse: (raw) => {
      const m = compact(raw).match(new RegExp(`^(\\d{4})([${SPANISH_LETTERS}]{3})$`));
      return m ? `${m[1]} ${m[2]}` : null;
    },
  },
  {
    id: "es_old",
    label: "España (antigua provincial)",
    example: "M 1234 AB",
    rule: "provincia, 4 números y 1 o 2 letras (p. ej. M 1234 AB)",
    parse: (raw) => {
      const m = compact(raw).match(/^([A-Z]{1,2})(\d{4})([A-Z]{1,2})$/);
      if (!m || !SPANISH_PROVINCES.has(m[1])) return null;
      return `${m[1]} ${m[2]} ${m[3]}`;
    },
  },
  {
    id: "pt",
    label: "Portugal",
    example: "AA-00-AA",
    rule: "2 letras, 2 números y 2 letras (p. ej. AB-12-CD)",
    parse: (raw) => {
      const m = compact(raw).match(/^([A-Z]{2})(\d{2})([A-Z]{2})$/);
      return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    },
  },
  {
    id: "fr",
    label: "Francia",
    example: "AB-123-CD",
    rule: "2 letras, 3 números y 2 letras (p. ej. AB-123-CD)",
    parse: (raw) => {
      const m = compact(raw).match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
      return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    },
  },
  {
    id: "it",
    label: "Italia",
    example: "AB 123 CD",
    rule: "2 letras, 3 números y 2 letras (p. ej. AB 123 CD)",
    parse: (raw) => {
      const m = compact(raw).match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
      return m ? `${m[1]} ${m[2]} ${m[3]}` : null;
    },
  },
  {
    id: "de",
    label: "Alemania",
    example: "B AB 1234",
    rule: "ciudad (1-3 letras), 1-2 letras y 1-4 números, separados por espacios (p. ej. B AB 1234)",
    parse: (raw) => {
      // Aquí los espacios son necesarios para saber dónde acaba la ciudad.
      const m = raw.toUpperCase().trim().match(/^([A-ZÄÖÜ]{1,3})[\s-]+([A-Z]{1,2})[\s-]*(\d{1,4})([EH]?)$/);
      return m ? `${m[1]} ${m[2]} ${m[3]}${m[4]}` : null;
    },
  },
  {
    id: "other",
    label: "Otro país",
    example: "ABC123",
    rule: "entre 2 y 10 letras o números",
    parse: (raw) => {
      const c = compact(raw);
      return /^[A-Z0-9]{2,10}$/.test(c) ? c : null;
    },
  },
];

export const DEFAULT_PLATE_FORMAT = "es";

export function getPlateFormat(id: string): PlateFormat {
  return PLATE_FORMATS.find((f) => f.id === id) ?? PLATE_FORMATS[0];
}

export type PlateCheck = { ok: true; plate: string } | { ok: false; error: string };

export function validatePlate(raw: string, formatId: string): PlateCheck {
  const format = getPlateFormat(formatId);
  if (!raw.trim()) return { ok: false, error: "Escribe la matrícula" };
  const plate = format.parse(raw);
  if (!plate) {
    // Pista útil para el error más común: vocales en una matrícula española.
    if (format.id === "es" && /^\d{4}[A-Z]{3}$/.test(compact(raw))) {
      return { ok: false, error: "Las matrículas españolas no llevan vocales, Ñ ni Q. Revisa las letras." };
    }
    return { ok: false, error: `Formato no válido para ${format.label}: ${format.rule}.` };
  }
  return { ok: true, plate };
}

/** Clave para comparar matrículas sin separadores (evita duplicados "1234BCD" vs "1234 BCD"). */
export function plateKey(plate: string): string {
  return compact(plate);
}
