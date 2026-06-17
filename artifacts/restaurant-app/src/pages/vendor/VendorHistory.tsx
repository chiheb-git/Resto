import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency, getCurrency } from "@/lib/currency";
import { useListOrders } from "@workspace/api-client-react";
import type { OrderWithItems } from "@workspace/api-client-react";
import i18n from "@/i18n";

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", label: "En attente" },
  confirmed: { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", label: "Confirmée"  },
  refused:   { bg: "rgba(239,68,68,0.12)",   color: "#f87171", label: "Refusée"    },
  ready:     { bg: "rgba(34,197,94,0.12)",   color: "#4ade80", label: "Prête"      },
  delivered: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", label: "Livree" },
  paid: { bg: "rgba(0,210,100,0.12)", color: "#00D264", label: "Payee" },
};

const STATUS_ICONS: Record<string, string> = {
  pending: "...", confirmed: "OK", refused: "X", ready: "!", delivered: "OK", paid: "OK",
};
export default function VendorHistory() {
  const { t } = useTranslation();
  const { formatPrice, ready: currencyReady } = useCurrency();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const lang = i18n.language as "fr" | "en" | "ar";
  const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";

  const { data: orders = [], isLoading } = useListOrders({ date });
  if (!currencyReady) return null;
  const typedOrders = orders as OrderWithItems[];

  /* ---- Stats ---- */
  const totalRevenue = typedOrders.filter(o => ["delivered","paid"].includes(o.status)).reduce((s, o) => s + Number(o.totalPrice), 0);
  const delivered = typedOrders.filter(o => ["delivered","paid"].includes(o.status)).length;


  /* ---- Export XLSX professionnel ---- */
  const exportXLSX = async () => {
    const XLSX = await import("xlsx");

    /* Données */
    const rows = typedOrders.map((o) => ({
      "N° Commande":  `#${o.id}`,
      "Table":        `Table ${o.table?.number ?? "?"}`,
      "Statut":       STATUS_BADGE[o.status]?.label ?? o.status,
      "Total":    Number(o.totalPrice).toFixed(2),
      "Heure":        new Date(o.createdAt).toLocaleTimeString("fr-FR"),
      "Date":         new Date(o.createdAt).toLocaleDateString("fr-FR"),
      "Articles":     o.items.map(i =>
        `${i.quantity}x ${i.dish ? ((i.dish as unknown as Record<string,string>)[nameKey] || i.dish.nameEn) : "?"}`
      ).join(" | "),
      "Note":         o.note ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    /* Largeurs colonnes */
    ws["!cols"] = [
      { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 20 },
    ];

    /* Ligne titre fusionnée */
    const titleWs: Record<string, unknown> = {
      A1: { v: `📋 Historique des Commandes — ${new Date(date).toLocaleDateString("fr-FR", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}`, t: "s" },
      A2: { v: `Total commandes: ${typedOrders.length}  |  Chiffre d'affaires: ${formatPrice(totalRevenue)}  |  Livrées: ${delivered}  |  En attente: ${pending}`, t: "s" },
    };

    /* Copier les données après 2 lignes de titre */
    const dataRows = typedOrders.map((o) => [
      `#${o.id}`,
      `Table ${o.table?.number ?? "?"}`,
      STATUS_BADGE[o.status]?.label ?? o.status,
      Number(o.totalPrice).toFixed(2),
      new Date(o.createdAt).toLocaleTimeString("fr-FR"),
      new Date(o.createdAt).toLocaleDateString("fr-FR"),
      o.items.map(i => `${i.quantity}x ${i.dish ? ((i.dish as unknown as Record<string,string>)[nameKey] || i.dish.nameEn) : "?"}`).join(" | "),
      o.note ?? "",
    ]);

    const headers = ["N° Commande", "Table", "Statut", "Total", "Heure", "Date", "Articles", "Note"];
    const allRows = [
      [`RESTAURANTOS — Rapport du ${new Date(date).toLocaleDateString("fr-FR")}`],
      [`${typedOrders.length} commandes | CA: ${formatPrice(totalRevenue)} | Livrées: ${delivered} | En attente: ${pending}`],
      [],
      headers,
      ...dataRows,
      [],
      [`Exporté le ${new Date().toLocaleString("fr-FR")} | RestaurantOS Pro`],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(allRows);
    ws2["!cols"] = [
      { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 45 }, { wch: 25 },
    ];

    /* Merge titre */
    ws2["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws2, "Commandes");

    /* Feuille stats */
    const statsRows = [
      ["STATISTIQUES DU JOUR"],
      [],
      ["Métrique", "Valeur"],
      ["Total commandes", typedOrders.length],
      ["Chiffre d'affaires", `${formatPrice(totalRevenue)}`],
      ["Commandes livrées", delivered],
      ["En attente", pending],
      ["Ticket moyen", typedOrders.length > 0 ? `${formatPrice(totalRevenue / typedOrders.length)}` : formatPrice(0)],
      [],
      ["Date rapport", new Date(date).toLocaleDateString("fr-FR")],
      ["Généré par", "RestaurantOS Pro"],
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsRows);
    wsStats["!cols"] = [{ wch: 25 }, { wch: 20 }];
    wsStats["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, wsStats, "Statistiques");

    XLSX.writeFile(wb, `RestaurantOS_Rapport_${date}.xlsx`);
  };

  /* ---- UI ---- */
  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", background: "var(--bg-deep, #0A0A0F)", fontFamily: "var(--font-body,'DM Sans',sans-serif)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, color: "#FF6B35", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            RestaurantOS · Historique
          </p>
          <h1 style={{ fontFamily: "var(--font-display,'Playfair Display',Georgia,serif)", fontSize: 28, fontWeight: 700, color: "#F5F5F0", marginBottom: 4 }}>
            Rapport du jour
          </h1>
          <p style={{ fontSize: 13, color: "rgba(245,245,240,0.45)" }}>
            {new Date(date).toLocaleDateString("fr-FR", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "9px 14px", borderRadius: 12,
              background: "rgba(26,26,38,1)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              color: "#F5F5F0", fontSize: 13, outline: "none",
              cursor: "pointer",
            }}
          />
          <button
            onClick={exportXLSX}
            style={{
              padding: "9px 20px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "white", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
              transition: "transform 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            📊 Exporter Excel Pro
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Commandes", value: typedOrders.length, icon: "📋", color: "#60a5fa" },
          { label: "Chiffre d'affaires", value: `${formatPrice(totalRevenue)}`, icon: "💰", color: "#FF6B35" },
          { label: "Livrées", value: delivered, icon: "🎉", color: "#4ade80" },
          { label: "En attente", value: pending, icon: "⏳", color: "#fbbf24" },
          { label: "Ticket moyen", value: currencyReady ? (typedOrders.length > 0 ? formatPrice(totalRevenue/typedOrders.length) : formatPrice(0)) : "...", icon: "📈", color: "#c084fc" },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "rgba(26,26,38,1)",
            border: "0.5px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: "16px 18px",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "rgba(245,245,240,0.4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 56, background: "rgba(26,26,38,0.6)", borderRadius: 12, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{
          background: "rgba(18,18,26,1)",
          border: "0.5px solid rgba(255,255,255,0.06)",
          borderRadius: 20, overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "80px 90px 120px 100px 90px 1fr 120px",
            padding: "12px 20px",
            background: "rgba(26,26,38,0.8)",
            borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          }}>
            {["N°", "Table", "Statut", "Total", "Heure", "Articles", "Note"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,245,240,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {typedOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ color: "rgba(245,245,240,0.3)", fontSize: 14 }}>Aucune commande ce jour</p>
            </div>
          ) : (
            typedOrders.map((order, idx) => {
              const st = STATUS_BADGE[order.status] ?? STATUS_BADGE.pending;
              return (
                <div key={order.id} style={{
                  display: "grid",
                  gridTemplateColumns: "80px 90px 120px 100px 90px 1fr 120px",
                  padding: "14px 20px",
                  borderBottom: idx < typedOrders.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none",
                  transition: "background 0.15s",
                  alignItems: "center",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(245,245,240,0.5)", fontWeight: 600 }}>#{order.id}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#F5F5F0" }}>Table {order.table?.number}</div>
                  <div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 100,
                      background: st.bg, color: st.color,
                      fontSize: 11, fontWeight: 700,
                      border: `0.5px solid ${st.color}33`,
                    }}>
                      {STATUS_ICONS[order.status]} {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#FF6B35" }}>{currencyReady ? formatPrice(order.totalPrice) : "..."}</div>
                  <div style={{ fontSize: 12, color: "rgba(245,245,240,0.4)" }}>{new Date(order.createdAt).toLocaleTimeString("fr-FR")}</div>
                  <div style={{ fontSize: 12, color: "rgba(245,245,240,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {order.items.map(i => `${i.quantity}× ${i.dish ? ((i.dish as unknown as Record<string,string>)[nameKey] || i.dish.nameEn) : "?"}`).join(" · ")}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(245,245,240,0.3)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {order.note || "—"}
                  </div>
                </div>
              );
            })
          )}

          {/* Footer total */}
          {typedOrders.length > 0 && (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 20px",
              background: "rgba(26,26,38,0.8)",
              borderTop: "0.5px solid rgba(255,107,53,0.15)",
            }}>
              <span style={{ fontSize: 12, color: "rgba(245,245,240,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Total · {typedOrders.length} commande{typedOrders.length > 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#FF6B35" }}>
                {formatPrice(totalRevenue)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
