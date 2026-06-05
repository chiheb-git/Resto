import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useListOrders } from "@workspace/api-client-react";
import type { OrderWithItems } from "@workspace/api-client-react";
import i18n from "@/i18n";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  refused: "bg-red-500/20 text-red-400",
  ready: "bg-green-500/20 text-green-400",
  delivered: "bg-gray-500/20 text-gray-400",
};

export default function VendorHistory() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const lang = i18n.language as "fr" | "en" | "ar";
  const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";

  const { data: orders = [], isLoading } = useListOrders({ date });

  const exportCSV = () => {
    const header = "ID,Table,Status,Total,Items,Date\n";
    const rows = (orders as OrderWithItems[]).map((o) => {
      const items = o.items.map((i) => `${i.quantity}x ${i.dish ? (i.dish as unknown as Record<string, string>)[nameKey] || i.dish.nameEn : "?"}`).join("; ");
      return `${o.id},${o.table?.number ?? "?"},${o.status},${Number(o.totalPrice).toFixed(2)},"${items}",${new Date(o.createdAt).toLocaleString()}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("history")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{(orders as OrderWithItems[]).length} orders on {date}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button onClick={exportCSV}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">
            {t("exportCSV")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("tableNumber")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("total")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("time")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">Items</th>
              </tr>
            </thead>
            <tbody>
              {(orders as OrderWithItems[]).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t("noData")}</td></tr>
              ) : (
                (orders as OrderWithItems[]).map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-muted-foreground">#{order.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{t("tableNumber")} {order.table?.number}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[order.status] ?? ""}`}>
                        {t(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">{Number(order.totalPrice).toFixed(2)} €</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {order.items.map((i) => `${i.quantity}× ${i.dish ? (i.dish as unknown as Record<string, string>)[nameKey] || i.dish.nameEn : "?"}`).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
