// Date / period helpers. Dates are stored as ISO strings.

export type PeriodKey = "day" | "week" | "month" | "year";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  day: "Hoje",
  week: "Semana",
  month: "Mês",
  year: "Ano",
};

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Week starts on Monday.
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function startOfYear(d: Date): Date {
  const x = startOfDay(d);
  x.setMonth(0, 1);
  return x;
}

export function periodRange(period: PeriodKey, ref = new Date()): { from: Date; to: Date } {
  const to = endOfDay(ref);
  switch (period) {
    case "day":
      return { from: startOfDay(ref), to };
    case "week":
      return { from: startOfWeek(ref), to };
    case "month":
      return { from: startOfMonth(ref), to };
    case "year":
      return { from: startOfYear(ref), to };
  }
}

export function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function addDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Next visit = last visit + cycleDays (default 60). Returns null when no last visit.
export function nextVisitDate(lastVisitIso: string | null | undefined, cycleDays = 60): Date | null {
  if (!lastVisitIso) return null;
  return addDays(lastVisitIso, cycleDays);
}

export type VisitStatus = "sem-visita" | "em-dia" | "proxima" | "atrasado";

export function visitStatus(
  lastVisitIso: string | null | undefined,
  cycleDays = 60,
): { status: VisitStatus; next: Date | null; daysUntil: number | null } {
  if (!lastVisitIso) return { status: "sem-visita", next: null, daysUntil: null };
  const next = nextVisitDate(lastVisitIso, cycleDays)!;
  const daysUntil = daysBetween(new Date(), next);
  let status: VisitStatus = "em-dia";
  if (daysUntil < 0) status = "atrasado";
  else if (daysUntil <= 5) status = "proxima";
  return { status, next, daysUntil };
}

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateLong(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const hh = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${min}`;
}

export function todayKey(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
