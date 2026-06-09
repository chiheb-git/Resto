import { useEffect } from "react";
import { useCurrency } from "@/lib/currency";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey, OrderStatusUpdateStatus } from "@workspace/api-client-react";
import type { OrderWithItems } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import { getSocket } from "@/lib/socket";
const ORANGE = "#FF6B00"; const CARD = "#141414"; const CARD2 = "#1C1C1C"; const BORDER = "#2A2A2A"; const TEXT = "#FFFFFF"; const MUTED = "#888888"; const GREEN = "#00D264";
export default function VendorPayment() {
  const queryClient = useQueryClient();
  const lang = i18n.language as "fr" | "en" | "ar";
  const nameKey = ("name" + lang.charAt(0).toUpperCase() + lang.slice(1)) as "nameEn" | "nameFr" | "nameAr";
  const { formatPrice, ready: currencyReady } = useCurrency();
  const updateStatus = useUpdateOrderStatus();
  const { data: orders = [] } = useListOrders({}, { query: { refetchInterval: 5000 } as any });
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    socket.on("vendor:new-order", refresh); socket.on("order:updated", refresh);
    return () => { socket.off("vendor:new-order", refresh); socket.off("order:updated", refresh); };
  }, [queryClient]);
  if (!currencyReady) return null;
  const readyOrders = (orders as OrderWithItems[]).filter((o) => o.status === "ready");
  const paidOrders = (orders as OrderWithItems[]).filter((o) => o.status === "delivered");
  const totalPaid = paidOrders.reduce((s, o) => s + Number(o.totalPrice), 0);
  const totalPending = readyOrders.reduce((s, o) => s + Number(o.totalPrice), 0);
  const markPaid = (id: number) => {
    updateStatus.mutate({ id, data: { status: OrderStatusUpdateStatus.delivered } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); toast.success("Paiement confirme !"); },
      onError: () => toast.error("Erreur"),
    });
  };
  const getName = (item: any) => item.quantity + "x " + (item.dish ? (item.dish as any)[nameKey] || item.dish.nameEn : "?");
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 4 }}>Paiements</h1>
        <p style={{ fontSize: 13, color: MUTED }}>Tables en attente de paiement et historique du jour</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "En attente", value: String(readyOrders.length), sub: formatPrice(totalPending), color: ORANGE },
          { label: "Payees", value: String(paidOrders.length), sub: formatPrice(totalPaid), color: GREEN },
          { label: "Total encaisse", value: formatPrice(totalPaid), sub: paidOrders.length + " commandes", color: "#0096FF" },
        ].map((s) => (
          <div key={s.label} style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 16, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 14 }}>En attente de paiement</h2>
        {readyOrders.length === 0 ? (
          <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 16, padding: 40, textAlign: "center" }}>
            <p style={{ color: TEXT, fontWeight: 600 }}>Aucune table en attente</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {readyOrders.map((order) => (
              <div key={order.id} style={{ background: CARD, border: "2px solid rgba(255,107,0,0.3)", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,107,0,0.15)", border: "2px solid rgba(255,107,0,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, color: ORANGE, fontWeight: 700 }}>TABLE</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ORANGE }}>{(order as any).table?.number ?? "?"}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 4 }}>Commande #{order.id}</p>
                    <p style={{ fontSize: 12, color: MUTED }}>{order.items.map(getName).join(", ")}</p>
                    <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: ORANGE, marginBottom: 8 }}>{formatPrice(order.totalPrice)}</p>
                  <button onClick={() => markPaid(order.id)} disabled={updateStatus.isPending} style={{ padding: "10px 20px", background: GREEN, color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Paiement recu
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Commandes payees - Total: {formatPrice(totalPaid)}</h2>
        {paidOrders.length === 0 ? (
          <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 16, padding: 32, textAlign: "center" }}>
            <p style={{ color: MUTED }}>Aucune commande payee</p>
          </div>
        ) : (
          <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 100px", padding: "10px 16px", background: CARD2, fontSize: 11, fontWeight: 700, color: MUTED }}>
              <span>Table</span><span>Plats</span><span>Heure</span><span style={{ textAlign: "right" }}>Total</span>
            </div>
            {paidOrders.map((order) => (
              <div key={order.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 100px", padding: "12px 16px", borderTop: "1px solid " + BORDER, alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: GREEN }}>#{(order as any).table?.number ?? "?"}</span>
                <span style={{ fontSize: 12, color: MUTED }}>{order.items.map(getName).join(", ")}</span>
                <span style={{ fontSize: 12, color: MUTED }}>{new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                <span style={{ textAlign: "right", fontWeight: 700, color: GREEN }}>{formatPrice(order.totalPrice)}</span>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 100px", padding: "12px 16px", background: "rgba(0,210,100,0.08)", borderTop: "2px solid rgba(0,210,100,0.3)" }}>
              <span style={{ fontWeight: 800, color: TEXT, gridColumn: "1 / 4" }}>TOTAL ENCAISSE</span>
              <span style={{ textAlign: "right", fontWeight: 800, color: GREEN, fontSize: 16 }}>{formatPrice(totalPaid)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
