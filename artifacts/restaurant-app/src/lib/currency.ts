import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";
export type Currency = "DZD" | "EUR" | "USD";
const STORAGE_KEY = "restaurantos_currency";
const API_URL = import.meta.env.VITE_API_URL || "";

export function getCurrency(): Currency {
  return (localStorage.getItem(STORAGE_KEY) as Currency) ?? "DZD";
}

export async function fetchCurrencyFromServer(): Promise<Currency> {
  try {
    const res = await fetch(`${API_URL}/api/settings/currency`);
    const data = await res.json();
    const c = data.value as Currency;
    localStorage.setItem(STORAGE_KEY, c);
    window.dispatchEvent(new Event("currency-change"));
    return c;
  } catch {
    return getCurrency();
  }
}

export async function saveCurrencyToServer(c: Currency, token: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/settings/currency`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ value: c }),
    });
    localStorage.setItem(STORAGE_KEY, c);
    window.dispatchEvent(new Event("currency-change"));
  } catch {}
}

export function formatPrice(price: number | string, currency?: Currency): string {
  const c = currency ?? getCurrency();
  const n = Number(price).toFixed(2);
  if (c === "DZD") return `${n} DA`;
  if (c === "EUR") return `${n} €`;
  if (c === "USD") return `$${n}`;
  return `${n}`;
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(getCurrency());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetchCurrencyFromServer().then(c => { setCurrencyState(c); setReady(true); });
    const handler = () => setCurrencyState(getCurrency());
    window.addEventListener("currency-change", handler);
    const socketHandler = (data: { key: string; value: string }) => {
      if (data.key === "currency") {
        localStorage.setItem(STORAGE_KEY, data.value);
        setCurrencyState(data.value as Currency);
      }
    };
    socket.on("settings:updated", socketHandler);
    return () => {
      window.removeEventListener("currency-change", handler);
      socket.off("settings:updated", socketHandler);
    };
  }, []);
  return {
    currency,
    ready,
    formatPrice: (price: number | string) => formatPrice(price, currency),
  };
}