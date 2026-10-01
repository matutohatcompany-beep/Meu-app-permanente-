// Central offline data store. Loads the whole database from local storage once
// on launch, keeps it in memory, and persists every mutation. No network is
// ever required for any operation here.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { storage } from "@/src/utils/storage";
import { newId } from "@/src/db/ids";
import {
  Client,
  Config,
  CountryEvent,
  Database,
  Expense,
  Goals,
  MessageTemplate,
  Product,
  Sale,
  SaleItem,
} from "@/src/db/types";
import { finalizeItem, rollUpSale } from "@/src/logic/calculations";
import { formatBRL } from "@/src/logic/money";

const DB_KEY = "matuto.db.v1";

function defaultDB(): Database {
  const now = new Date().toISOString();
  const seedMessages: MessageTemplate[] = [
    {
      id: newId("msg"),
      title: "Pós-venda",
      body:
        "Olá {nome}! Tudo bem? Passando para agradecer sua compra. Qualquer coisa estou à disposição!",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId("msg"),
      title: "Aniversário",
      body: "Parabéns, {nome}! 🎉 Muita saúde e sucesso. Um abraço do Renan!",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId("msg"),
      title: "Cliente sumido",
      body:
        "Oi {nome}, faz um tempo que não nos falamos! Chegaram novidades em {cidade}. Quer dar uma olhada?",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId("msg"),
      title: "Próxima visita",
      body:
        "Olá {nome}! Estarei em {cidade} dia {data}. Separo algo especial para você?",
      createdAt: now,
      updatedAt: now,
    },
  ];
  return {
    clients: [],
    products: [],
    sales: [],
    expenses: [],
    messages: seedMessages,
    events: [],
    changelog: [],
    goals: { bootAnnual: 0, modaAnnual: 0, tripDaysPerWeek: 4 },
    config: { commissionPct: 15, cycleDays: 60 },
    cities: [],
  };
}

function mergeDefaults(partial: Partial<Database> | null): Database {
  const base = defaultDB();
  if (!partial) return base;
  return {
    clients: partial.clients ?? base.clients,
    products: partial.products ?? base.products,
    sales: partial.sales ?? base.sales,
    expenses: partial.expenses ?? base.expenses,
    messages: partial.messages ?? base.messages,
    events: partial.events ?? base.events,
    changelog: partial.changelog ?? base.changelog,
    goals: { ...base.goals, ...(partial.goals ?? {}) },
    config: { ...base.config, ...(partial.config ?? {}) },
    cities: partial.cities ?? base.cities,
  };
}

interface DataContextValue {
  db: Database;
  loading: boolean;
  // products
  addProduct: (p: Omit<Product, keyof BaseFields>) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  findProductByCode: (type: Product["type"], code: string) => Product | undefined;
  // clients
  addClient: (c: Omit<Client, keyof BaseFields>) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  // sales
  addSale: (input: NewSaleInput) => Sale;
  undoLastSale: () => Sale | null;
  correctSale: (id: string, input: NewSaleInput) => void;
  deleteSale: (id: string) => void;
  // expenses
  upsertExpense: (date: string, total: number, details?: Expense["details"], notes?: string) => void;
  deleteExpense: (id: string) => void;
  // goals / config
  updateGoals: (patch: Partial<Goals>) => void;
  updateCommission: (pct: number) => void;
  updateConfig: (patch: Partial<Config>) => void;
  // cities
  addCity: (name: string) => void;
  removeCity: (name: string) => void;
  // messages
  addMessage: (t: Omit<MessageTemplate, keyof BaseFields>) => void;
  updateMessage: (id: string, patch: Partial<MessageTemplate>) => void;
  deleteMessage: (id: string) => void;
  // events
  addEvent: (e: Omit<CountryEvent, keyof BaseFields>) => void;
  deleteEvent: (id: string) => void;
  // changelog
  restoreChange: (id: string) => void;
  // backup
  exportJSON: () => string;
  importJSON: (json: string) => { ok: boolean; error?: string };
  resetAll: () => void;
}

type BaseFields = "id" | "createdAt" | "updatedAt" | "deletedAt";

export interface NewSaleItemInput {
  productType: Product["type"];
  productId: string;
  code: string;
  name: string;
  category?: Product["category"];
  size?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  commissionPct?: number;
}

export interface NewSaleInput {
  date?: string;
  clientId?: string | null;
  clientName?: string;
  city?: string;
  location?: Sale["location"];
  payment?: string;
  items: NewSaleItemInput[];
}

const Ctx = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(() => defaultDB());
  const [loading, setLoading] = useState(true);
  const dbRef = useRef(db);
  dbRef.current = db;

  // Load once.
  useEffect(() => {
    let active = true;
    (async () => {
      const raw = await storage.getItem(DB_KEY, "");
      let parsed: Partial<Database> | null = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
      }
      if (active) {
        setDb(mergeDefaults(parsed));
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: Database) => {
    dbRef.current = next;
    setDb(next);
    // fire-and-forget; storage never throws
    storage.setItem(DB_KEY, JSON.stringify(next));
  }, []);

  const mutate = useCallback(
    (fn: (prev: Database) => Database) => {
      persist(fn(dbRef.current));
    },
    [persist],
  );

  const stamp = () => new Date().toISOString();

  const logChange = (
    db0: Database,
    entity: string,
    entityId: string,
    label: string,
    field: string,
    beforeRaw: unknown,
    afterRaw: unknown,
    display: (v: unknown) => string,
    restorable: boolean,
  ): Database => {
    const now = stamp();
    return {
      ...db0,
      changelog: [
        {
          id: newId("log"),
          entity,
          entityId,
          label,
          field,
          before: display(beforeRaw),
          after: display(afterRaw),
          rawBefore: JSON.stringify(beforeRaw),
          rawAfter: JSON.stringify(afterRaw),
          restorable,
          createdAt: now,
          updatedAt: now,
        },
        ...db0.changelog,
      ],
    };
  };

  // --- products -------------------------------------------------------------
  const addProduct: DataContextValue["addProduct"] = useCallback(
    (p) => {
      const now = stamp();
      const product: Product = { ...p, id: newId("prod"), createdAt: now, updatedAt: now };
      mutate((d) => ({ ...d, products: [product, ...d.products] }));
      return product;
    },
    [mutate],
  );

  const updateProduct: DataContextValue["updateProduct"] = useCallback(
    (id, patch) => {
      mutate((d) => {
        const idx = d.products.findIndex((x) => x.id === id);
        if (idx === -1) return d;
        const prev = d.products[idx];
        let next = { ...d };
        const moneyFields = new Set(["cost", "price"]);
        const watch: (keyof Product)[] = ["cost", "price", "name", "code", "category"];
        for (const f of watch) {
          if (patch[f] !== undefined && patch[f] !== prev[f]) {
            const isMoney = moneyFields.has(f as string);
            next = logChange(
              next,
              "Produto",
              id,
              prev.name || prev.code,
              f as string,
              prev[f],
              patch[f],
              (v) => (isMoney ? formatBRL(Number(v) || 0) : String(v ?? "—")),
              true,
            );
          }
        }
        const products = [...next.products];
        products[idx] = { ...prev, ...patch, updatedAt: stamp() };
        return { ...next, products };
      });
    },
    [mutate],
  );

  const deleteProduct: DataContextValue["deleteProduct"] = useCallback(
    (id) => {
      mutate((d) => ({
        ...d,
        products: d.products.map((p) =>
          p.id === id ? { ...p, deletedAt: stamp() } : p,
        ),
      }));
    },
    [mutate],
  );

  const findProductByCode: DataContextValue["findProductByCode"] = useCallback(
    (type, code) =>
      dbRef.current.products.find(
        (p) => !p.deletedAt && p.type === type && p.code.toLowerCase() === code.trim().toLowerCase(),
      ),
    [],
  );

  // --- clients --------------------------------------------------------------
  const addClient: DataContextValue["addClient"] = useCallback(
    (c) => {
      const now = stamp();
      const client: Client = { ...c, id: newId("cli"), createdAt: now, updatedAt: now };
      mutate((d) => {
        const cities = c.city && !d.cities.includes(c.city) ? [...d.cities, c.city] : d.cities;
        return { ...d, clients: [client, ...d.clients], cities };
      });
      return client;
    },
    [mutate],
  );

  const updateClient: DataContextValue["updateClient"] = useCallback(
    (id, patch) => {
      mutate((d) => {
        const clients = d.clients.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: stamp() } : c,
        );
        const cities =
          patch.city && !d.cities.includes(patch.city) ? [...d.cities, patch.city] : d.cities;
        return { ...d, clients, cities };
      });
    },
    [mutate],
  );

  const deleteClient: DataContextValue["deleteClient"] = useCallback(
    (id) => {
      mutate((d) => ({
        ...d,
        clients: d.clients.map((c) => (c.id === id ? { ...c, deletedAt: stamp() } : c)),
      }));
    },
    [mutate],
  );

  // --- sales ----------------------------------------------------------------
  const buildSale = (input: NewSaleInput, existing?: Sale): Sale => {
    const now = stamp();
    const items: SaleItem[] = input.items.map((it) =>
      finalizeItem({
        id: newId("item"),
        productType: it.productType,
        productId: it.productId,
        code: it.code,
        name: it.name,
        category: it.category,
        size: it.size,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unitCost: it.unitCost,
        commissionPct: it.commissionPct,
        total: 0,
      }),
    );
    const totals = rollUpSale(items);
    return {
      id: existing?.id ?? newId("sale"),
      date: input.date ?? existing?.date ?? now,
      clientId: input.clientId ?? null,
      clientName: input.clientName,
      city: input.city,
      location: input.location,
      payment: input.payment,
      items,
      ...totals,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  };

  const addSale: DataContextValue["addSale"] = useCallback(
    (input) => {
      const sale = buildSale(input);
      mutate((d) => {
        let clients = d.clients;
        if (sale.clientId) {
          clients = d.clients.map((c) =>
            c.id === sale.clientId ? { ...c, lastVisitDate: sale.date, updatedAt: stamp() } : c,
          );
        }
        const cities = sale.city && !d.cities.includes(sale.city) ? [...d.cities, sale.city] : d.cities;
        return { ...d, sales: [sale, ...d.sales], clients, cities };
      });
      return sale;
    },
    [mutate],
  );

  const undoLastSale: DataContextValue["undoLastSale"] = useCallback(() => {
    const active = dbRef.current.sales.filter((s) => !s.deletedAt);
    if (active.length === 0) return null;
    // "last confirmed" = most recent by createdAt
    const last = active.reduce((a, b) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
    );
    mutate((d) => {
      const now = stamp();
      return {
        ...d,
        sales: d.sales.map((s) => (s.id === last.id ? { ...s, deletedAt: now } : s)),
        changelog: [
          {
            id: newId("log"),
            entity: "Venda",
            entityId: last.id,
            label: last.clientName || "Venda",
            field: "desfazer",
            before: formatBRL(last.bootTotal + last.modaTotal),
            after: "desfeita",
            restorable: false,
            createdAt: now,
            updatedAt: now,
          },
          ...d.changelog,
        ],
      };
    });
    return last;
  }, [mutate]);

  const correctSale: DataContextValue["correctSale"] = useCallback(
    (id, input) => {
      mutate((d) => {
        const existing = d.sales.find((s) => s.id === id);
        if (!existing) return d;
        const rebuilt = buildSale(input, existing);
        const now = stamp();
        return {
          ...d,
          sales: d.sales.map((s) => (s.id === id ? rebuilt : s)),
          changelog: [
            {
              id: newId("log"),
              entity: "Venda",
              entityId: id,
              label: rebuilt.clientName || "Venda",
              field: "correção",
              before: formatBRL(existing.bootTotal + existing.modaTotal),
              after: formatBRL(rebuilt.bootTotal + rebuilt.modaTotal),
              restorable: false,
              createdAt: now,
              updatedAt: now,
            },
            ...d.changelog,
          ],
        };
      });
    },
    [mutate],
  );

  const deleteSale: DataContextValue["deleteSale"] = useCallback(
    (id) => {
      mutate((d) => ({
        ...d,
        sales: d.sales.map((s) => (s.id === id ? { ...s, deletedAt: stamp() } : s)),
      }));
    },
    [mutate],
  );

  // --- expenses -------------------------------------------------------------
  const upsertExpense: DataContextValue["upsertExpense"] = useCallback(
    (date, total, details, notes) => {
      mutate((d) => {
        const now = stamp();
        const idx = d.expenses.findIndex((e) => !e.deletedAt && e.date === date);
        if (idx >= 0) {
          const expenses = [...d.expenses];
          expenses[idx] = { ...expenses[idx], total, details, notes, updatedAt: now };
          return { ...d, expenses };
        }
        const expense: Expense = {
          id: newId("exp"),
          date,
          total,
          details,
          notes,
          createdAt: now,
          updatedAt: now,
        };
        return { ...d, expenses: [expense, ...d.expenses] };
      });
    },
    [mutate],
  );

  const deleteExpense: DataContextValue["deleteExpense"] = useCallback(
    (id) => {
      mutate((d) => ({
        ...d,
        expenses: d.expenses.map((e) => (e.id === id ? { ...e, deletedAt: stamp() } : e)),
      }));
    },
    [mutate],
  );

  // --- goals / config -------------------------------------------------------
  const updateGoals: DataContextValue["updateGoals"] = useCallback(
    (patch) => {
      mutate((d) => ({ ...d, goals: { ...d.goals, ...patch } }));
    },
    [mutate],
  );

  const updateCommission: DataContextValue["updateCommission"] = useCallback(
    (pct) => {
      mutate((d) => {
        const prev = d.config.commissionPct;
        if (prev === pct) return d;
        const logged = logChange(
          d,
          "Comissão",
          "config",
          "Comissão de botinas",
          "commissionPct",
          prev,
          pct,
          (v) => `${v}%`,
          true,
        );
        return { ...logged, config: { ...logged.config, commissionPct: pct } };
      });
    },
    [mutate],
  );

  const updateConfig: DataContextValue["updateConfig"] = useCallback(
    (patch) => {
      mutate((d) => ({ ...d, config: { ...d.config, ...patch } }));
    },
    [mutate],
  );

  // --- cities ---------------------------------------------------------------
  const addCity: DataContextValue["addCity"] = useCallback(
    (name) => {
      const n = name.trim();
      if (!n) return;
      mutate((d) => (d.cities.includes(n) ? d : { ...d, cities: [...d.cities, n].sort() }));
    },
    [mutate],
  );

  const removeCity: DataContextValue["removeCity"] = useCallback(
    (name) => {
      mutate((d) => ({ ...d, cities: d.cities.filter((c) => c !== name) }));
    },
    [mutate],
  );

  // --- messages -------------------------------------------------------------
  const addMessage: DataContextValue["addMessage"] = useCallback(
    (t) => {
      const now = stamp();
      mutate((d) => ({
        ...d,
        messages: [{ ...t, id: newId("msg"), createdAt: now, updatedAt: now }, ...d.messages],
      }));
    },
    [mutate],
  );

  const updateMessage: DataContextValue["updateMessage"] = useCallback(
    (id, patch) => {
      mutate((d) => ({
        ...d,
        messages: d.messages.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: stamp() } : m)),
      }));
    },
    [mutate],
  );

  const deleteMessage: DataContextValue["deleteMessage"] = useCallback(
    (id) => {
      mutate((d) => ({ ...d, messages: d.messages.filter((m) => m.id !== id) }));
    },
    [mutate],
  );

  // --- events ---------------------------------------------------------------
  const addEvent: DataContextValue["addEvent"] = useCallback(
    (e) => {
      const now = stamp();
      mutate((d) => ({
        ...d,
        events: [{ ...e, id: newId("evt"), createdAt: now, updatedAt: now }, ...d.events],
      }));
    },
    [mutate],
  );

  const deleteEvent: DataContextValue["deleteEvent"] = useCallback(
    (id) => {
      mutate((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
    },
    [mutate],
  );

  // --- changelog restore ----------------------------------------------------
  const restoreChange: DataContextValue["restoreChange"] = useCallback(
    (id) => {
      mutate((d) => {
        const log = d.changelog.find((l) => l.id === id);
        if (!log || !log.restorable || log.rawBefore === undefined) return d;
        let value: unknown;
        try {
          value = JSON.parse(log.rawBefore);
        } catch {
          return d;
        }
        let next = { ...d };
        if (log.entity === "Produto") {
          next = {
            ...next,
            products: next.products.map((p) =>
              p.id === log.entityId ? { ...p, [log.field]: value, updatedAt: stamp() } : p,
            ),
          };
        } else if (log.entity === "Comissão") {
          next = { ...next, config: { ...next.config, commissionPct: Number(value) } };
        } else {
          return d;
        }
        return {
          ...next,
          changelog: next.changelog.map((l) => (l.id === id ? { ...l, restored: true } : l)),
        };
      });
    },
    [mutate],
  );

  // --- backup ---------------------------------------------------------------
  const exportJSON: DataContextValue["exportJSON"] = useCallback(() => {
    return JSON.stringify({ __matuto: true, version: 1, exportedAt: stamp(), data: dbRef.current }, null, 2);
  }, []);

  const importJSON: DataContextValue["importJSON"] = useCallback(
    (json) => {
      try {
        const parsed = JSON.parse(json);
        const data = parsed?.data ?? parsed;
        if (!data || typeof data !== "object") return { ok: false, error: "Arquivo inválido." };
        if (!Array.isArray(data.clients) || !Array.isArray(data.products) || !Array.isArray(data.sales)) {
          return { ok: false, error: "Estrutura do backup não reconhecida." };
        }
        persist(mergeDefaults(data));
        return { ok: true };
      } catch {
        return { ok: false, error: "Não foi possível ler o arquivo JSON." };
      }
    },
    [persist],
  );

  const resetAll: DataContextValue["resetAll"] = useCallback(() => {
    persist(defaultDB());
  }, [persist]);

  const value = useMemo<DataContextValue>(
    () => ({
      db,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      findProductByCode,
      addClient,
      updateClient,
      deleteClient,
      addSale,
      undoLastSale,
      correctSale,
      deleteSale,
      upsertExpense,
      deleteExpense,
      updateGoals,
      updateCommission,
      updateConfig,
      addCity,
      removeCity,
      addMessage,
      updateMessage,
      deleteMessage,
      addEvent,
      deleteEvent,
      restoreChange,
      exportJSON,
      importJSON,
      resetAll,
    }),
    [
      db, loading, addProduct, updateProduct, deleteProduct, findProductByCode, addClient,
      updateClient, deleteClient, addSale, undoLastSale, correctSale, deleteSale, upsertExpense,
      deleteExpense, updateGoals, updateCommission, updateConfig, addCity, removeCity, addMessage,
      updateMessage, deleteMessage, addEvent, deleteEvent, restoreChange, exportJSON, importJSON, resetAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// Convenience selectors (exclude soft-deleted)
export function useActiveClients() {
  const { db } = useData();
  return useMemo(() => db.clients.filter((c) => !c.deletedAt), [db.clients]);
}

export function useActiveProducts() {
  const { db } = useData();
  return useMemo(() => db.products.filter((p) => !p.deletedAt), [db.products]);
}

export function useActiveSales() {
  const { db } = useData();
  return useMemo(() => db.sales.filter((s) => !s.deletedAt), [db.sales]);
}

export function useActiveExpenses() {
  const { db } = useData();
  return useMemo(() => db.expenses.filter((e) => !e.deletedAt), [db.expenses]);
}
