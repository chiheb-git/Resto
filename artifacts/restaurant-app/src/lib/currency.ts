export type Currency = "DZD" | "EUR" | "USD";
const STORAGE_KEY = "restaurantos_currency";
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("currency_sync") : null;

export function getCurrency(): Currency {
  return (localStorage.getItem(STORAGE_KEY) as Currency) ?? "DZD";
}

export function setCurrency(c: Currency) {
  localStorage.setItem(STORAGE_KEY, c);
  window.dispatchEvent(new Event("currency-change"));
  channel?.postMessage(c);
}

export function formatPrice(price: number | string, currency?: Currency): string {
  const c = currency ?? getCurrency();
  const n = Number(price).toFixed(2);
  if (c === "DZD") return `${n} DA`;
  if (c === "EUR") return `${n} €`;
  if (c === "USD") return `$${n}`;
  return `${n}`;
}

import { useState, useEffect } from "react";
export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(getCurrency());
  useEffect(() => {
    const handler = () => setCurrencyState(getCurrency());
    const bcHandler = (e: MessageEvent) => { setCurrencyState(e.data as Currency); };
    window.addEventListener("currency-change", handler);
    channel?.addEventListener("message", bcHandler);
    return () => {
      window.removeEventListener("currency-change", handler);
      channel?.removeEventListener("message", bcHandler);
    };
  }, []);
  return {
    currency,
    setCurrency: (c: Currency) => { setCurrency(c); setCurrencyState(c); },
    formatPrice: (price: number | string) => formatPrice(price, currency),
  };
}