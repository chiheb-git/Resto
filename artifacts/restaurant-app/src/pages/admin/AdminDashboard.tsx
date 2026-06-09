import { useTranslation } from "react-i18next";
import { getSocket } from "@/lib/socket";
import { useCurrency, saveCurrencyToServer, type Currency } from "@/lib/currency";
import { useEffect } from "react";
import { useGetDashboardStats, useGetOrdersByStatus } from "@workspace/api-client-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#22c55e", "#6b7280"];
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  refused: "Refusée",
  ready: "Prête",
  delivered: "Livrée",
};

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${accent ?? "bg-primary/15"}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { currency, formatPrice } = useCurrency();
  useEffect(() => {
    const refresh = () => { queryClient.invalidateQueries({ queryKey: ["dashboardStats"] }); queryClient.invalidateQueries({ queryKey: ["ordersByStatus"] }); };
    getSocket().on("vendor:new-order", refresh);
    getSocket().on("order:updated", refresh);
    return () => { getSocket().off("vendor:new-order", refresh); getSocket().off("order:updated", refresh); };
  }, []);
  const { data: stats, isLoading } = useGetDashboardStats({ query: { refetchInterval: 10000 } as any });
  const { data: ordersByStatus = [] } = useGetOrdersByStatus({ query: { refetchInterval: 10000 } as any });

  if (isLoading || !stats) {
    return (
      <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  const pieData = (ordersByStatus as { status: string; count: number }[]).map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: d.count,
  }));

  const totalOrders = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">{t("dashboard")}</h1>
        <select value={currency} onChange={(e) => { const token = localStorage.getItem("token") ?? ""; saveCurrencyToServer(e.target.value as Currency, token); }} className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground">
          <option value="DZD">🇩🇿 Dinar (DA)</option>
          <option value="EUR">🇪🇺 Euro (€)</option>
          <option value="USD">🇺🇸 Dollar ($)</option>
        </select>
      </div>
        <p className="text-sm text-muted-foreground mt-1">Overview of today's performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label={t("todayRevenue")} value={formatPrice(stats.todayRevenue)} icon="💰" accent="bg-amber-500/15" />
        <StatCard label={t("todayOrders")} value={stats.todayOrders} icon="📋" accent="bg-blue-500/15" />
        <StatCard label={t("pendingOrders")} value={stats.pendingOrders} icon="⏳" accent="bg-orange-500/15" />
        <StatCard label={t("avgRating")} value={`${Number(stats.avgRating).toFixed(1)} ★`} icon="⭐" accent="bg-yellow-500/15" />
        <StatCard label={t("activeTables")} value={stats.activeTables} icon="🪑" accent="bg-green-500/15" />
        <StatCard label={t("totalDishes")} value={stats.totalDishes} icon="🍽️" accent="bg-purple-500/15" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">{t("ordersByStatus")}</h2>
        {pieData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <span className="text-4xl">📭</span>
            <p className="text-sm">Aucune commande aujourd'hui</p>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div style={{ position: "relative", width: 180, height: 180, flexShrink: 0 }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={pieData.length > 1 ? 3 : 0}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                textAlign: "center", pointerEvents: "none"
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#F5F5F0" }}>{totalOrders}</div>
                <div style={{ fontSize: 10, color: "rgba(245,245,240,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>total</div>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{item.value}</span>
                    <span className="text-xs text-muted-foreground">({Math.round(item.value / totalOrders * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
