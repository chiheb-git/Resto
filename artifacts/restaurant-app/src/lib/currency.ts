export type Currency = "DZD" | "EUR" | "USD";
const STORAGE_KEY = "restaurantos_currency";
export function getCurrency(): Currency {
  return (localStorage.getItem(STORAGE_KEY) as Currency) ?? "DZD";
}
export function setCurrency(c: Currency) {
  localStorage.setItem(STORAGE_KEY, c);
  window.dispatchEvent(new Event("currency-change"));
  // cross-tab sync: storage event fires in other tabs automatically
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
    const storageHandler = (e: StorageEvent) => { if (e.key === "restaurantos_currency") setCurrencyState(getCurrency()); };
    window.addEventListener("currency-change", handler);
    window.addEventListener("storage", storageHandler);
    return () => { window.removeEventListener("currency-change", handler); window.removeEventListener("storage", storageHandler); };
  }, []);
  return {
    currency,
    setCurrency: (c: Currency) => { setCurrency(c); setCurrencyState(c); },
    formatPrice: (price: number | string) => formatPrice(price, currency),
  };
}