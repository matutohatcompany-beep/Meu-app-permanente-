// Money is handled as INTEGER CENTS everywhere. These helpers convert to/from
// the Brazilian display format "R$ 1.234,56" and parse user input safely.

// Round to nearest cent (integer).
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

// Format integer cents -> "R$ 1.234,56"
export function formatBRL(cents: number | undefined | null): string {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  const negative = n < 0;
  const abs = Math.abs(Math.round(n));
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const reaisStr = reais
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centStr = centavos.toString().padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${reaisStr},${centStr}`;
}

// Format cents without the "R$ " prefix -> "1.234,56"
export function formatNumber(cents: number | undefined | null): string {
  return formatBRL(cents).replace("R$ ", "");
}

// Parse a user-typed string ("45,00", "45.00", "R$ 45,00", "45") -> integer cents.
export function parseMoneyToCents(input: string): number {
  if (!input) return 0;
  // keep digits, comma, dot and minus
  let s = input.replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  // If both separators present, assume the last one is the decimal separator.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma === -1 && lastDot === -1) {
    normalized = s; // integer reais
    const cents = Math.round(parseFloat(normalized) * 100);
    return (negative ? -1 : 1) * (Number.isFinite(cents) ? cents : 0);
  }
  const decimalSep = lastComma > lastDot ? "," : ".";
  const thousandSep = decimalSep === "," ? "." : ",";
  normalized = s.split(thousandSep).join("").replace(decimalSep, ".");
  const value = parseFloat(normalized);
  const cents = Math.round((Number.isFinite(value) ? value : 0) * 100);
  return (negative ? -1 : 1) * cents;
}

// A live, masked money input value. Takes raw digits typed and returns the
// formatted BRL string treating input as centavos (e.g. "4" -> "R$ 0,04").
export function maskMoneyDigits(digits: string): { text: string; cents: number } {
  const clean = digits.replace(/\D/g, "");
  const cents = clean ? parseInt(clean, 10) : 0;
  return { text: formatBRL(cents), cents };
}
