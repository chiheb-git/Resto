import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useGetRevenueStats,
  useGetPopularDishes,
  useGetPeakHours,
} from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

type Period = "day" | "week" | "month" | "year";

function formatLabel(label: string, period: Period) {
  try {
    const d = new Date(label);
    if (period === "day") return d.toLocaleTimeString([], { hour: "2-digit" });
    if (period === "year") return d.toLocaleDateString([], { month: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return label;
  }
}

export default function AdminStats() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("week");

  const { data: revenue = [], isLoading: revLoading } = useGetRevenueStats({ period });
  const { data: popular = [], isLoading: popLoading } = useGetPopularDishes({ limit: 8 });
  const { data: peakHours = [], isLoading: peakLoading } = useGetPeakHours();

  const periods: Period[] = ["day", "week", "month", "year"];

  const totalRevenue = (revenue as { revenue: number }[]).reduce((s, r) => s + r.revenue, 0);
  const totalOrders = (revenue as { orders: number }[]).reduce((s, r) => s + r.orders, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("statistics")}</h1>
        <p className="text-sm text-muted-foreground mt-1">Revenue, popular dishes, and peak hours</p>
      </div>

      {/* Revenue chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("revenueOverTime")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total: {totalRevenue.toFixed(2)} € · {totalOrders} orders
            </p>
          </div>
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(p)}
              </button>
            ))}
          </div>
        </div>

        {revLoading ? (
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        ) : (revenue as { label: string; revenue: number }[]).length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t("noData")}</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={(revenue as { label: string; revenue: number }[]).map((d) => ({ ...d, label: formatLabel(d.label, period) }))}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                formatter={(val: number) => [`${val.toFixed(2)} €`, t("revenue")]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Popular dishes */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t("popularDishes")}</h2>
          {popLoading ? (
            <div className="h-40 bg-muted animate-pulse rounded-lg" />
          ) : (popular as { nameEn: string; totalOrdered: number }[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("noData")}</div>
          ) : (
            <div className="space-y-2">
              {(popular as { nameEn: string; nameFr: string; nameAr: string; totalOrdered: number; imageUrl: string | null }[]).map((dish, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-foreground truncate">{dish.nameFr || dish.nameEn}</span>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{dish.totalOrdered}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(dish.totalOrdered / ((popular as { totalOrdered: number }[])[0]?.totalOrdered || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak hours */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t("peakHours")}</h2>
          {peakLoading ? (
            <div className="h-40 bg-muted animate-pulse rounded-lg" />
          ) : (peakHours as { hour: number; count: number }[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("noData")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={(peakHours as { hour: number; count: number }[]).map((d) => ({ ...d, label: `${d.hour}h` }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  {(peakHours as { count: number }[]).map((_, i) => (
                    <Cell key={i} fill={`hsl(28 90% ${40 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
