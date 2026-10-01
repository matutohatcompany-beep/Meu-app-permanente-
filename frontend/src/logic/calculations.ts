// CENTRALIZED BUSINESS RULES. Every screen must use these — never duplicate
// financial formulas in the UI. All values are integer cents.

import type { Goals, Sale, SaleItem, Expense, Product } from "@/src/db/types";
import { periodRange, inRange, PeriodKey } from "@/src/logic/date";

// --- per item ---------------------------------------------------------------

export function calcBootCommission(total: number, pct: number): number {
  return Math.round((total * pct) / 100);
}

export function calcCountryProfit(total: number, totalCost: number): number {
  return total - totalCost;
}

// Compute the derived fields of a single item from its inputs + snapshots.
export function finalizeItem(item: SaleItem): SaleItem {
  const qty = Math.max(0, Math.floor(item.quantity || 0));
  const unitPrice = Math.max(0, Math.round(item.unitPrice || 0));
  const total = qty * unitPrice;
  if (item.productType === "botina") {
    const pct = item.commissionPct ?? 15;
    return {
      ...item,
      quantity: qty,
      unitPrice,
      total,
      commission: calcBootCommission(total, pct),
      // botinas have no cost for the seller
      unitCost: undefined,
      totalCost: undefined,
      profit: undefined,
    };
  }
  const unitCost = Math.max(0, Math.round(item.unitCost || 0));
  const totalCost = qty * unitCost;
  return {
    ...item,
    quantity: qty,
    unitPrice,
    unitCost,
    total,
    totalCost,
    profit: calcCountryProfit(total, totalCost),
    commission: undefined,
  };
}

// --- per sale ---------------------------------------------------------------

export function rollUpSale(items: SaleItem[]) {
  let bootTotal = 0;
  let bootCommission = 0;
  let modaTotal = 0;
  let modaCost = 0;
  let modaProfit = 0;
  for (const it of items) {
    if (it.productType === "botina") {
      bootTotal += it.total;
      bootCommission += it.commission ?? 0;
    } else {
      modaTotal += it.total;
      modaCost += it.totalCost ?? 0;
      modaProfit += it.profit ?? 0;
    }
  }
  return {
    bootTotal,
    bootCommission,
    modaTotal,
    modaCost,
    modaProfit,
    grossGain: modaProfit + bootCommission,
  };
}

// --- aggregated summaries ---------------------------------------------------

export interface Summary {
  bootTotal: number;
  bootCommission: number;
  modaTotal: number;
  modaCost: number;
  modaProfit: number;
  grossGain: number; // modaProfit + bootCommission
  expenses: number;
  netGain: number; // grossGain - expenses
  salesCount: number;
}

export function emptySummary(): Summary {
  return {
    bootTotal: 0,
    bootCommission: 0,
    modaTotal: 0,
    modaCost: 0,
    modaProfit: 0,
    grossGain: 0,
    expenses: 0,
    netGain: 0,
    salesCount: 0,
  };
}

export function summarize(sales: Sale[], expenses: Expense[]): Summary {
  const s = emptySummary();
  for (const sale of sales) {
    if (sale.deletedAt) continue;
    s.bootTotal += sale.bootTotal;
    s.bootCommission += sale.bootCommission;
    s.modaTotal += sale.modaTotal;
    s.modaCost += sale.modaCost;
    s.modaProfit += sale.modaProfit;
    s.salesCount += 1;
  }
  for (const e of expenses) {
    if (e.deletedAt) continue;
    s.expenses += e.total;
  }
  s.grossGain = s.modaProfit + s.bootCommission;
  s.netGain = s.grossGain - s.expenses;
  return s;
}

export function summarizeForPeriod(
  sales: Sale[],
  expenses: Expense[],
  period: PeriodKey,
  ref = new Date(),
): Summary {
  const { from, to } = periodRange(period, ref);
  const ps = sales.filter((x) => !x.deletedAt && inRange(x.date, from, to));
  const pe = expenses.filter((x) => !x.deletedAt && inRange(x.date, from, to));
  return summarize(ps, pe);
}

// --- goals ------------------------------------------------------------------

export function derivedGoal(
  goals: Goals,
  which: "boot" | "moda",
  period: PeriodKey,
): number {
  const annual = which === "boot" ? goals.bootAnnual : goals.modaAnnual;
  const trip = goals.tripDaysPerWeek || 4;
  const overrideKey = {
    year: null,
    month: which === "boot" ? goals.bootMonthly : goals.modaMonthly,
    week: which === "boot" ? goals.bootWeekly : goals.modaWeekly,
    day: which === "boot" ? goals.bootDaily : goals.modaDaily,
  }[period];
  if (period === "year") return annual;
  if (typeof overrideKey === "number") return overrideKey;
  // auto: mensal = anual/12 ; semanal = anual/52 ; diária = semanal/tripDays
  const weekly = Math.round(annual / 52);
  switch (period) {
    case "month":
      return Math.round(annual / 12);
    case "week":
      return weekly;
    case "day":
      return Math.round(weekly / trip);
  }
  return annual;
}

export function goalProgress(sold: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(1, sold / goal);
}

// Default auto-derived goal preview (used in Admin recalc).
export function recalcGoals(annualBoot: number, annualModa: number, tripDays: number): Partial<Goals> {
  const td = tripDays || 4;
  return {
    bootMonthly: Math.round(annualBoot / 12),
    bootWeekly: Math.round(annualBoot / 52),
    bootDaily: Math.round(annualBoot / 52 / td),
    modaMonthly: Math.round(annualModa / 12),
    modaWeekly: Math.round(annualModa / 52),
    modaDaily: Math.round(annualModa / 52 / td),
  };
}

// --- client+product price history -------------------------------------------

// Last price a given client paid for a given product (from sale history).
export function lastPriceForClientProduct(
  sales: Sale[],
  clientId: string | null | undefined,
  productId: string,
): { unitPrice: number; date: string } | null {
  if (!clientId) return null;
  let best: { unitPrice: number; date: string } | null = null;
  for (const sale of sales) {
    if (sale.deletedAt || sale.clientId !== clientId) continue;
    for (const it of sale.items) {
      if (it.productId === productId) {
        if (!best || new Date(sale.date) > new Date(best.date)) {
          best = { unitPrice: it.unitPrice, date: sale.date };
        }
      }
    }
  }
  return best;
}

// --- recompra (restock) -----------------------------------------------------

export interface RestockRow {
  productId: string;
  code: string;
  name: string;
  category?: string;
  qtySold: number;
  currentCost: number; // from current product registry
  estimatedCost: number; // qtySold * currentCost
}

export function restockReport(
  sales: Sale[],
  products: Product[],
  from: Date,
  to: Date,
  category?: string,
): RestockRow[] {
  const map = new Map<string, RestockRow>();
  for (const sale of sales) {
    if (sale.deletedAt || !inRange(sale.date, from, to)) continue;
    for (const it of sale.items) {
      if (it.productType !== "moda") continue;
      if (category && it.category !== category) continue;
      const prod = products.find((p) => p.id === it.productId && !p.deletedAt);
      const currentCost = prod?.cost ?? it.unitCost ?? 0;
      const existing = map.get(it.productId);
      if (existing) {
        existing.qtySold += it.quantity;
        existing.currentCost = currentCost;
        existing.estimatedCost = existing.qtySold * currentCost;
      } else {
        map.set(it.productId, {
          productId: it.productId,
          code: it.code,
          name: it.name,
          category: it.category,
          qtySold: it.quantity,
          currentCost,
          estimatedCost: it.quantity * currentCost,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.estimatedCost - a.estimatedCost);
}
