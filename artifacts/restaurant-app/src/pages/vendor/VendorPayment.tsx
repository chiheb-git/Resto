import { useEffect, useState } from "react";
import { useCurrency } from "@/lib/currency";
import { useListOrders, useListCATEGORIEs, useListDishes, useUpdateOrderStatus, getListOrdersQueryKey, OrderStatusUpdateStatus, customFetch } from "@workspace/api-client-react";
import type { OrderWithItems } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import { getSocket } from "@/lib/socket";
const ORANGE = "#FF6B00"; const CARD = "#141414"; const CARD2 = "#1C1C1C"; const BORDER = "#2A2A2A"; const TEXT = "#FFFFFF"; const MUTED = "#888888"; const GREEN = "#00D264";
export default function VendorPayment() {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<{ id: number; price: string } | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualTable, setManualTable] = useState("");
  const [manualCatId, setManualCatId] = useState<number | null>(null);
  const [manualSelected, setManualSelected] = useState<{id:number;name:string;price:number;qty:number}[]>([]);
  const { data: CATEGORIEs = [] } = useListCATEGORIEs({ includeInactive: false });
  const { data: dishes = [] } = useListDishes(manualCatId ? { categoryId: manualCatId } : {});
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
  const readyOrders = (orders as OrderWithItems[]).filter((o) => o.status === "delivered");
  const paidOrders = (orders as OrderWithItems[]).filter((o) => o.status === "paid");
  const totalPaid = paidOrders.reduce((s, o) => s + Number(o.totalPrice), 0);
  const totalPending = readyOrders.reduce((s, o) => s + Number(o.totalPrice), 0);
  const markPaid = (id: number) => {
    updateStatus.mutate({ id, data: { status: OrderStatusUpdateStatus.paid } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); toast.success("Paiement confirme !"); },
      onError: () => toast.error("Erreur"),
    });
  };
  const updatePrice = async (id: number, price: number) => {
    try {
      await customFetch(`/api/orders/${id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPrice: price }),
      });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      toast.success("Prix modifie !");
      setEditPrice(null);
    } catch { toast.error("Erreur"); }
  };
  const getName = (item: any) => item.quantity + "x " + (item.dish ? (item.dish as any)[nameKey] || item.dish.nameEn : "?");

  const manualTotal = manualSelected.reduce((s, i) => s + i.price * i.qty, 0);

  const toggleDish = (dish: any) => {
    const name = (dish as any)[nameKey] || dish.nameEn;
    const price = Number(dish.price);
    setManualSelected(prev => {
      const exists = prev.find(d => d.id === dish.id);
      if (exists) return prev.filter(d => d.id !== dish.id);
      return [...prev, { id: dish.id, name, price, qty: 1 }];
    });
  };

  const changeQty = (id: number, delta: number) => {
    setManualSelected(prev => prev.map(d => d.id === id ? { ...d, qty: Math.max(1, d.qty + delta) } : d));
  };

  const submitManual = async () => {
    if (!manualTable || manualSelected.length === 0) { toast.error("Choisir table et au moins un plat"); return; }
    try {
      const tablesRes = await customFetch<any[]>("/api/tables");
      const table = tablesRes.find((t: any) => String(t.number) === String(manualTable));
      if (!table) { toast.error("Table introuvable"); return; }
      const items = manualSelected.map(d => ({ dishId: d.id, quantity: d.qty }));
      const order = await customFetch<any>("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: table.id, items }),
      });
      await customFetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      toast.success("Commande manuelle ajout�e !");
      setShowManual(false);
      setManualTable("");
      setManualSelected([]);
      setManualCatId(null);
    } catch (e) { toast.error("Erreur lors de la cr�ation"); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 4 }}>Paiements</h1>
          <p style={{ fontSize: 13, color: MUTED }}>Tables en attente de paiement et historique du jour</p>
        </div>
        <button onClick={() => setShowManual(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#FF6B00,#FF9F1C)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Commande manuelle
        </button>
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => setEditPrice({ id: order.id, price: String(order.totalPrice) })} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: ORANGE, background: "rgba(255,107,0,0.1)", border: "1px solid rgba(255,107,0,0.3)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 600 }}>
                      Modifier
                    </button>
                    <p style={{ fontSize: 24, fontWeight: 800, color: ORANGE, margin: 0 }}>{formatPrice(order.totalPrice)}</p>
                  </div>
                  <button onClick={() => setConfirmId(order.id)} style={{ padding: "10px 28px", background: GREEN, color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}>
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
      {confirmId !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 16, padding: 32, width: 320, textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Confirmer le paiement ?</p>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Cette action est irr�versible.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Annuler</button>
              <button onClick={() => { markPaid(confirmId!); setConfirmId(null); }} disabled={updateStatus.isPending} style={{ padding: "10px 20px", background: "#00D264", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {showManual && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002, padding: 16 }}>
          <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #2A2A2A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>Commande manuelle</h2>
                <p style={{ color: "#888", fontSize: 12, margin: "4px 0 0" }}>Selectionner table et plats</p>
              </div>
              <button onClick={() => { setShowManual(false); setManualSelected([]); setManualCatId(null); setManualTable(""); }} style={{ background: "#2A2A2A", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>X</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: 24 }}>
              {/* NUMERO DE TABLE */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#FF6B00", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>NUMERO DE TABLE</label>
                <input type="number" min="1" placeholder="Ex: 3" value={manualTable} onChange={e => setManualTable(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", background: "#1C1C1C", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 16, fontWeight: 700, boxSizing: "border-box" }} />
              </div>
              {/* CATEGORIEs */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#FF6B00", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>CATEGORIE</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(categories as any[]).map((cat: any) => (
                    <button key={cat.id} onClick={() => setManualCatId(cat.id === manualCatId ? null : cat.id)}
                      style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                        background: manualCatId === cat.id ? "#FF6B00" : "#1C1C1C",
                        borderColor: manualCatId === cat.id ? "#FF6B00" : "#333",
                        color: manualCatId === cat.id ? "#fff" : "#888" }}>
                      {(cat as any)[nameKey] || cat.nameEn}
                    </button>
                  ))}
                </div>
              </div>
              {/* Plats */}
              {manualCatId && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#FF6B00", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Plats</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(dishes as any[]).filter((d: any) => d.isAvailable).map((dish: any) => {
                      const selected = manualSelected.find(d => d.id === dish.id);
                      const dname = (dish as any)[nameKey] || dish.nameEn;
                      return (
                        <div key={dish.id} onClick={() => toggleDish(dish)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: selected ? "rgba(255,107,0,0.1)" : "#1C1C1C",
                            border: "1px solid", borderColor: selected ? "#FF6B00" : "#2A2A2A", borderRadius: 12, cursor: "pointer", transition: "all 0.15s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: selected ? "#FF6B00" : "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                              {selected ? "v" : ""}
                            </div>
                            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{dname}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {selected && (
                              <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <button onClick={() => changeQty(dish.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, background: "#333", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>-</button>
                                <span style={{ color: "#fff", fontWeight: 700, minWidth: 20, textAlign: "center" }}>{selected.qty}</span>
                                <button onClick={() => changeQty(dish.id, 1)} style={{ width: 26, height: 26, borderRadius: 6, background: "#333", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>+</button>
                              </div>
                            )}
                            <span style={{ color: "#FF6B00", fontWeight: 700, fontSize: 14 }}>{formatPrice(dish.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* S�lection r�sum� */}
              {manualSelected.length > 0 && (
                <div style={{ background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 12, padding: 16, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>RECAPITULATIF</div>
                  {manualSelected.map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #2A2A2A" }}>
                      <span style={{ color: "#ccc", fontSize: 13 }}>{d.qty}� {d.name}</span>
                      <span style={{ color: "#FF6B00", fontWeight: 700, fontSize: 13 }}>{formatPrice(d.price * d.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #2A2A2A", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>TOTAL</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#FF6B00" }}>{formatPrice(manualTotal)}</div>
              </div>
              <button onClick={submitManual}
                style={{ padding: "12px 32px", background: manualSelected.length > 0 && manualTable ? "linear-gradient(135deg,#FF6B00,#FF9F1C)" : "#2A2A2A",
                  color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                Valider la commande
              </button>
            </div>
          </div>
        </div>
      )}
      {editPrice !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
          <div style={{ background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 16, padding: 32, width: 300, textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Modifier le prix</p>
            <input type="number" value={editPrice.price} onChange={(e) => setEditPrice({ ...editPrice, price: e.target.value })} style={{ width: "100%", padding: "10px 14px", background: "#111", border: "1px solid #333", borderRadius: 10, color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 20, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setEditPrice(null)} style={{ padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Annuler</button>
              <button onClick={() => updatePrice(editPrice.id, Number(editPrice.price))} style={{ padding: "10px 20px", background: "#FF6B00", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
