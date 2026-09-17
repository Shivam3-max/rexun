"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { CartLine } from "@/lib/types";

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  savings: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "rexsun.cart.v2";
const MAX_QTY = 10;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // localStorage throws in a private window and can return anything at all
  // after a version change; an empty cart is the right fallback either way.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l?.sku && l?.qty > 0));
      }
    } catch {
      /* start empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* the cart still works for this page view */
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    setLines((prev) => {
      const at = prev.findIndex((l) => l.sku === line.sku);
      if (at === -1) return [...prev, { ...line, qty }];
      const next = [...prev];
      next[at] = { ...next[at], ...line, qty: Math.min(MAX_QTY, next[at].qty + qty) };
      return next;
    });
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.sku !== sku)
        : prev.map((l) => (l.sku === sku ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))
    );
  }, []);

  const remove = useCallback((sku: string) => {
    setLines((prev) => prev.filter((l) => l.sku !== sku));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.price * l.qty, 0),
      savings: lines.reduce((s, l) => s + Math.max(0, l.mrp - l.price) * l.qty, 0),
      add,
      setQty,
      remove,
      clear,
      ready,
    }),
    [lines, add, setQty, remove, clear, ready]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
