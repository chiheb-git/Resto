import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey, OrderStatusUpdateStatus } from "@workspace/api-client-react";
import type { OrderWithItems } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";

const STATUSES = ["pending", "confirmed", "ready", "delivered"] as const;
type OrderStatus = "pending" | "confirmed" | "refused" | "ready" | "delivered";
type UpdateableStatus = typeof OrderStatusUpdateStatus[keyof typeof OrderStatusUpdateStatus];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "border-l-amber-500",
  confirmed: "border-l-blue-500",
  refused: "border-l-red-500",
  ready: "border-l-green-500",
  delivered: "border-l-gray-500",
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  refused: "bg-red-500/20 text-red-400",
  ready: "bg-green-500/20 text-green-400",
  delivered: "bg-gray-500/20 text-gray-400",
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function RefuseModal({ orderId, onClose, onConfirm }: { orderId: number; onClose: () => void; onConfirm: (reason: string) => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-foreground mb-3">{t("refuse")} #{orderId}</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("refusalReason") + " (optional)"}
          className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          rows={3}
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent">
            {t("cancel")}
          </button>
          <button onClick={() => onConfirm(reason)}
            className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-medium hover:opacity-90">
            {t("refuse")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onConfirm, onRefuse, onReady, onDeliver }: {
  order: OrderWithItems;
  onConfirm: (id: number) => void;
  onRefuse: (id: number) => void;
  onReady: (id: number) => void;
  onDeliver: (id: number) => void;
}) {
  const { t } = useTranslation();
  const lang = i18n.language as "fr" | "en" | "ar";
  const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";

  return (
    <div className={`bg-card border border-border border-l-4 ${STATUS_COLORS[order.status as OrderStatus]} rounded-xl p-3 space-y-2`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-sm">#{order.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[order.status as OrderStatus]}`}>
              {t(order.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("tableNumber")} {order.table?.number} · {timeAgo(order.createdAt)}
          </p>
        </div>
        <span className="font-bold text-primary text-sm">{Number(order.totalPrice).toFixed(2)} €</span>
      </div>

      <div className="space-y-0.5">
        {order.items.map((item) => {
          const name = item.dish ? (item.dish as unknown as Record<string, string>)[nameKey] || item.dish.nameEn : "?";
          return (
            <p key={item.id} className="text-xs text-foreground">
              {item.quantity}× {name}
              {item.customNote && <span className="text-muted-foreground"> — {item.customNote}</span>}
            </p>
          );
        })}
      </div>

      {order.note && (
        <p className="text-xs bg-muted/60 rounded-lg px-2 py-1 text-muted-foreground">{order.note}</p>
      )}

      <div className="flex gap-1.5 pt-1">
        {order.status === "pending" && (
          <>
            <button onClick={() => onConfirm(order.id)}
              className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:opacity-90">
              {t("confirm")}
            </button>
            <button onClick={() => onRefuse(order.id)}
              className="px-3 py-1.5 bg-destructive/20 text-destructive border border-destructive/30 rounded-lg text-xs font-medium hover:bg-destructive/30">
              {t("refuse")}
            </button>
          </>
        )}
        {order.status === "confirmed" && (
          <button onClick={() => onReady(order.id)}
            className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:opacity-90">
            {t("ready")} ✓
          </button>
        )}
        {order.status === "ready" && (
          <button onClick={() => onDeliver(order.id)}
            className="flex-1 py-1.5 bg-gray-500 text-white rounded-lg text-xs font-medium hover:opacity-90">
            {t("delivered")} ✓
          </button>
        )}
      </div>
    </div>
  );
}

export default function VendorDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [refuseOrderId, setRefuseOrderId] = useState<number | null>(null);
  const prevPendingCount = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  const { data: orders = [], isLoading } = useListOrders(
    {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { refetchInterval: 3000 } as any }
  );

  // Sound alert for new orders
  useEffect(() => {
    const currentPending = orders.filter((o) => o.status === "pending").length;
    if (currentPending > prevPendingCount.current && prevPendingCount.current > 0) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    }
    prevPendingCount.current = currentPending;
  }, [orders]);

  const updateStatus = useUpdateOrderStatus();

  const changeStatus = (id: number, status: UpdateableStatus, refusalReason?: string) => {
    updateStatus.mutate(
      { id, data: { status, refusalReason } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          toast.success(t("success"));
        },
        onError: () => toast.error(t("error")),
      }
    );
  };

  const grouped: Record<string, OrderWithItems[]> = {
    pending: [],
    confirmed: [],
    ready: [],
    delivered: [],
  };

  (orders as OrderWithItems[]).forEach((o) => {
    if (o.status in grouped) grouped[o.status].push(o);
  });

  const colConfig: { key: string; label: string; accent: string }[] = [
    { key: "pending", label: t("pending"), accent: "border-t-amber-500" },
    { key: "confirmed", label: t("confirmed"), accent: "border-t-blue-500" },
    { key: "ready", label: t("ready"), accent: "border-t-green-500" },
    { key: "delivered", label: t("delivered"), accent: "border-t-gray-500" },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("orderBoard")}</h1>
          <p className="text-sm text-muted-foreground">
            {orders.filter((o) => o.status === "pending").length} {t("pendingOrders").toLowerCase()}
          </p>
        </div>
        {orders.filter((o) => o.status === "pending").length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
            <span>⚠</span> {t("newOrder")}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-4 min-w-max h-full">
          {colConfig.map((col) => (
            <div key={col.key} className={`flex flex-col w-72 bg-card/50 border border-border border-t-2 ${col.accent} rounded-xl`}>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <span className="font-semibold text-sm text-foreground">{col.label}</span>
                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  {grouped[col.key]?.length ?? 0}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {grouped[col.key]?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">{t("noOrders")}</div>
                ) : (
                  grouped[col.key].map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onConfirm={(id) => changeStatus(id, OrderStatusUpdateStatus.confirmed)}
                      onRefuse={(id) => setRefuseOrderId(id)}
                      onReady={(id) => changeStatus(id, OrderStatusUpdateStatus.ready)}
                      onDeliver={(id) => changeStatus(id, OrderStatusUpdateStatus.delivered)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {refuseOrderId && (
        <RefuseModal
          orderId={refuseOrderId}
          onClose={() => setRefuseOrderId(null)}
          onConfirm={(reason) => {
            changeStatus(refuseOrderId, OrderStatusUpdateStatus.refused, reason);
            setRefuseOrderId(null);
          }}
        />
      )}
    </div>
  );
}
