// Domain types for Matuto / Renan Vendas.
// All monetary values are stored as INTEGER CENTS to avoid floating point errors.

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt?: string | null; // soft delete
}

export type ProductType = "botina" | "moda";
export type ModaCategory = "chapeu" | "cinto" | "fivela" | "acessorio";

export const MODA_CATEGORIES: { key: ModaCategory; label: string }[] = [
  { key: "chapeu", label: "Chapéus" },
  { key: "cinto", label: "Cintos" },
  { key: "fivela", label: "Fivelas" },
  { key: "acessorio", label: "Acessórios" },
];

export interface Product extends BaseEntity {
  type: ProductType;
  code: string;
  name: string;
  category?: ModaCategory; // moda only
  sizes?: string[]; // botina numerações
  cost?: number; // cents, moda only
  price: number; // cents — preço de tabela
  photoUri?: string | null;
}

export type CityStatus = "voltar" | "normal" | "evitar";

export interface Client extends BaseEntity {
  name: string;
  whatsapp?: string;
  city?: string;
  size?: string;
  birthday?: string; // free text or ISO
  howMet?: string;
  notes?: string;
  cycleWeek?: number; // 1..9 (route organization only)
  address?: string;
  lat?: number;
  lng?: number;
  lastVisitDate?: string | null; // ISO date
}

export type SaleLocation =
  | "loja"
  | "rodeio"
  | "fazenda"
  | "feira"
  | "evento"
  | "outro";

export const SALE_LOCATIONS: { key: SaleLocation; label: string }[] = [
  { key: "loja", label: "Loja" },
  { key: "rodeio", label: "Rodeio" },
  { key: "fazenda", label: "Fazenda" },
  { key: "feira", label: "Feira" },
  { key: "evento", label: "Evento" },
  { key: "outro", label: "Outro" },
];

// A sale item stores SNAPSHOTS of everything used in the calculation, so that
// changing the product registry later never alters historical sales.
export interface SaleItem {
  id: ID;
  productType: ProductType;
  productId: ID;
  code: string; // snapshot
  name: string; // snapshot
  category?: ModaCategory; // snapshot (moda)
  size?: string; // botina numeração
  quantity: number;
  unitPrice: number; // cents — price actually sold
  unitCost?: number; // cents snapshot (moda)
  commissionPct?: number; // snapshot (botina) e.g. 15
  // derived (stored for integrity)
  total: number; // quantity * unitPrice
  totalCost?: number; // quantity * unitCost (moda)
  profit?: number; // moda: total - totalCost
  commission?: number; // botina: total * pct / 100
}

export interface Sale extends BaseEntity {
  date: string; // ISO datetime
  clientId?: ID | null;
  clientName?: string; // snapshot
  city?: string;
  location?: SaleLocation;
  payment?: string;
  items: SaleItem[];
  // rolled-up totals (derived, stored)
  bootTotal: number;
  bootCommission: number;
  modaTotal: number;
  modaCost: number;
  modaProfit: number;
  grossGain: number; // modaProfit + bootCommission
}

export interface ExpenseDetails {
  fuel?: number;
  lodging?: number;
  food?: number;
  fees?: number;
  other?: number;
}

export interface Expense extends BaseEntity {
  date: string; // YYYY-MM-DD (day of travel)
  total: number; // cents
  details?: ExpenseDetails;
  notes?: string;
}

export interface Goals {
  bootAnnual: number; // cents
  modaAnnual: number; // cents
  tripDaysPerWeek: number; // default 4
  // manual overrides (cents); when undefined -> auto-derived
  bootDaily?: number;
  bootWeekly?: number;
  bootMonthly?: number;
  modaDaily?: number;
  modaWeekly?: number;
  modaMonthly?: number;
}

export interface Config {
  commissionPct: number; // default 15
  cycleStartDate?: string; // ISO date
  cycleDays: number; // default 60
}

export interface ChangeLog extends BaseEntity {
  entity: string; // e.g. "Produto", "Comissão"
  entityId: string;
  field: string;
  before: string; // formatted for display
  after: string; // formatted for display
  rawBefore?: string; // JSON for restore
  rawAfter?: string; // JSON for restore
  label?: string; // human readable context e.g. product name
  restorable?: boolean;
  restored?: boolean;
}

export interface MessageTemplate extends BaseEntity {
  title: string;
  body: string; // may contain {nome} {produto} {cidade} {data}
}

export interface CountryEvent extends BaseEntity {
  name: string;
  city?: string;
  date: string; // ISO date
  notes?: string;
}

export interface Database {
  clients: Client[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  messages: MessageTemplate[];
  events: CountryEvent[];
  changelog: ChangeLog[];
  goals: Goals;
  config: Config;
  cities: string[];
}
