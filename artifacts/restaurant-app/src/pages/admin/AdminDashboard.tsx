import { useTranslation } from "react-i18next";
import { useGetDashboardStats, useGetOrdersByStatus } from "@workspace/api-client-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#22c55e", "#6b7280"];

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stats, isLoading } = useGetDashboardStats({ query: { refetchInterval: 10000 } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersByStatus = [] } = useGetOrdersByStatus({ query: { refetchInterval: 10000 } as any });

  if (isLoading || !stats) {
    return (
      <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  const pieData = (ordersByStatus as { status: string; count: number }[]).map((d) => ({
    name: d.status,
    value: d.count,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of today's performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label={t("todayRevenue")} value={`${Number(stats.todayRevenue).toFixed(2)} €`} icon="💰" accent="bg-amber-500/15" />
        <StatCard label={t("todayOrders")} value={stats.todayOrders} icon="📋" accent="bg-blue-500/15" />
        <StatCard label={t("pendingOrders")} value={stats.pendingOrders} icon="⏳" accent="bg-orange-500/15" />
        <StatCard label={t("avgRating")} value={`${Number(stats.avgRating).toFixed(1)} ★`} icon="⭐" accent="bg-yellow-500/15" />
        <StatCard label={t("activeTables")} value={stats.activeTables} icon="🪑" accent="bg-green-500/15" />
        <StatCard label={t("totalDishes")} value={stats.totalDishes} icon="🍽" accent="bg-purple-500/15" />
      </div>

      {pieData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t("ordersByStatus")}</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, t(name as string)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-shrink-0">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-foreground">{t(item.name)}</span>
                  <span className="text-muted-foreground ml-1">({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
