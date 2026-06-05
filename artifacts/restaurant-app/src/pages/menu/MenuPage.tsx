import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation } from "wouter";
import { useTheme } from "next-themes";
import i18n from "@/i18n";
import {
  useGetTableByToken,
  useListCategories,
  useListDishes,
  useCreateOrder,
  useGetActiveOrderByTable,
  useCreateRating,
} from "@workspace/api-client-react";
import type { Dish, OrderWithItems } from "@workspace/api-client-react";
import { toast } from "sonner";

interface CartItem {
  dish: Dish;
  quantity: number;
  customNote?: string;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const colors: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    refused: "bg-red-500/20 text-red-400 border-red-500/30",
    ready: "bg-green-500/20 text-green-400 border-green-500/30",
    delivered: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colors[status] ?? "bg-muted text-muted-foreground"}`}>
      {t(status)}
    </span>
  );
}

function AllergenBadge({ allergen }: { allergen: string }) {
  const colors: Record<string, string> = {
    gluten: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    lactose: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    noix: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    oeufs: "bg-yellow-600/20 text-yellow-800 dark:text-yellow-300",
    poisson: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
    soja: "bg-green-500/20 text-green-700 dark:text-green-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[allergen] ?? "bg-muted text-muted-foreground"}`}>
      {allergen}
    </span>
  );
}

function DishCard({ dish, onAdd }: { dish: Dish; onAdd: (dish: Dish) => void }) {
  const { t } = useTranslation();
  const lang = i18n.language as "fr" | "en" | "ar";
  const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";
  const descKey = `description${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "descriptionEn" | "descriptionFr" | "descriptionAr";

  const name = dish[nameKey] || dish.nameEn;
  const desc = dish[descKey] || dish.descriptionEn;

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden flex gap-3 p-3 ${!dish.isAvailable ? "opacity-60" : ""}`}>
      {dish.imageUrl ? (
        <img src={dish.imageUrl} alt={name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
          🍽
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground">{name}</h3>
              {dish.isPopular && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">{t("popular")}</span>
              )}
              {dish.isNew && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">{t("new")}</span>
              )}
            </div>
            {desc && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>}
            {dish.allergens && dish.allergens.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {dish.allergens.map((a) => <AllergenBadge key={a} allergen={a} />)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-primary">{Number(dish.price).toFixed(2)} €</span>
          {dish.isAvailable ? (
            <button
              onClick={() => onAdd(dish)}
              className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {t("addToCart")}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">{t("unavailable")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderTracker({ order, tableId }: { order: OrderWithItems; tableId: number }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const ratingMutation = useCreateRating();
  const lang = i18n.language as "fr" | "en" | "ar";

  const steps = ["pending", "confirmed", "ready", "delivered"];
  const currentStep = steps.indexOf(order.status);

  const handleRating = () => {
    ratingMutation.mutate(
      { data: { orderId: order.id, stars: rating, comment } },
      {
        onSuccess: () => toast.success(t("success")),
        onError: () => toast.error(t("error")),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">{t("orderStatus")} #{order.id}</h3>
          <StatusBadge status={order.status} />
        </div>

        {order.status !== "refused" && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  i <= currentStep ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <span>{i + 1}</span>
                  <span>{t(step)}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-4 h-0.5 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {order.status === "refused" && order.refusalReason && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            {order.refusalReason}
          </div>
        )}

        <div className="space-y-2 mt-3">
          {order.items.map((item) => {
            const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";
            const dishName = item.dish ? ((item.dish as unknown as Record<string, string>)[nameKey]) || item.dish.nameEn : "Unknown";
            return (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.quantity}x {dishName}</span>
                <span className="text-muted-foreground">{(Number(item.unitPrice) * item.quantity).toFixed(2)} €</span>
              </div>
            );
          })}
          <div className="border-t border-border pt-2 flex items-center justify-between font-semibold">
            <span>{t("total")}</span>
            <span className="text-primary">{Number(order.totalPrice).toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {order.status === "delivered" && !order.rating && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3">{t("rateYourOrder")}</h3>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl transition-transform hover:scale-110 ${rating >= star ? "text-yellow-400" : "text-muted"}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("comment")}
            className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={2}
          />
          <button
            onClick={handleRating}
            disabled={rating === 0 || ratingMutation.isPending || !!ratingMutation.isSuccess}
            className="mt-3 w-full py-2 bg-primary text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {ratingMutation.isSuccess ? "✓ Submitted" : t("submitRating")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  const { t } = useTranslation();
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const lang = i18n.language;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [view, setView] = useState<"menu" | "cart" | "tracking">("menu");
  const [customizeItem, setCustomizeItem] = useState<{ dish: Dish; note: string } | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  const { data: table, isLoading: tableLoading, isError: tableError } = useGetTableByToken(params.token);
  const { data: categories } = useListCategories({ includeInactive: false });
  const { data: dishes } = useListDishes(
    activeCategory ? { categoryId: activeCategory } : {}
  );
  const { data: activeOrder } = useGetActiveOrderByTable(
    table?.id ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!table?.id && view === "tracking", refetchInterval: 3000 } as any }
  );

  const createOrder = useCreateOrder();

  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  const addToCart = (dish: Dish) => {
    setCustomizeItem({ dish, note: "" });
  };

  const confirmAddToCart = () => {
    if (!customizeItem) return;
    const existing = cart.find((c) => c.dish.id === customizeItem.dish.id && c.customNote === customizeItem.note);
    if (existing) {
      setCart(cart.map((c) => c === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { dish: customizeItem.dish, quantity: 1, customNote: customizeItem.note || undefined }]);
    }
    setCustomizeItem(null);
    toast.success(t("addToCart"));
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.dish.price) * item.quantity, 0);

  const placeOrder = () => {
    if (!table || cart.length === 0) return;
    createOrder.mutate(
      {
        data: {
          tableId: table.id,
          note: orderNote || undefined,
          items: cart.map((c) => ({
            dishId: c.dish.id,
            quantity: c.quantity,
            customNote: c.customNote,
          })),
        },
      },
      {
        onSuccess: (data) => {
          setOrderId(data.id);
          setCart([]);
          setView("tracking");
          toast.success(t("orderPlaced"));
        },
        onError: () => toast.error(t("error")),
      }
    );
  };

  const getLangName = (item: Record<string, unknown>) => {
    const key = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    return (item[key] as string) || (item.nameEn as string);
  };

  if (tableLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (tableError || !table) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Table not found</h2>
          <p className="text-muted-foreground text-sm">This QR code is invalid or the table has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">RestaurantOS</p>
              <p className="text-xs text-muted-foreground">{t("tableNumber")} {table.number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Lang */}
            {["fr", "en", "ar"].map((l) => (
              <button key={l} onClick={() => { i18n.changeLanguage(l); localStorage.setItem("lang", l); }}
                className={`text-xs px-2 py-1 rounded-md ${lang === l ? "bg-primary text-white" : "text-muted-foreground"}`}>
                {l.toUpperCase()}
              </button>
            ))}
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 text-muted-foreground hover:text-foreground">
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-border px-4 sticky top-[57px] bg-background z-10">
          {[
            { key: "menu", label: t("menu"), count: 0 },
            { key: "cart", label: t("yourCart"), count: cart.length },
            { key: "tracking", label: t("trackOrder"), count: 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as typeof view)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Menu view */}
        {view === "menu" && (
          <div className="pb-6">
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {getLangName(cat as unknown as Record<string, unknown>)}
                </button>
              ))}
            </div>

            <div className="px-4 space-y-3">
              {dishes?.map((dish) => (
                <DishCard key={dish.id} dish={dish} onAdd={addToCart} />
              ))}
              {dishes?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">{t("noData")}</div>
              )}
            </div>
          </div>
        )}

        {/* Cart view */}
        {view === "cart" && (
          <div className="p-4 space-y-4 pb-6">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-2">🛒</div>
                <p>{t("noData")}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map((item, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {getLangName(item.dish as unknown as Record<string, unknown>)}
                          </p>
                          {item.customNote && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.customNote}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCart(cart.map((c, j) => j === i ? { ...c, quantity: Math.max(0, c.quantity - 1) } : c).filter((c) => c.quantity > 0))}
                            className="w-7 h-7 rounded-full bg-muted text-foreground font-bold hover:bg-accent"
                          >−</button>
                          <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => setCart(cart.map((c, j) => j === i ? { ...c, quantity: c.quantity + 1 } : c))}
                            className="w-7 h-7 rounded-full bg-primary text-white font-bold hover:opacity-90"
                          >+</button>
                        </div>
                      </div>
                      <p className="text-right text-sm text-primary mt-1">
                        {(Number(item.dish.price) * item.quantity).toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("note")}</label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder={t("specialRequest")}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    rows={2}
                  />
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">{t("orderTotal")}</span>
                    <span className="text-primary text-lg">{cartTotal.toFixed(2)} €</span>
                  </div>
                </div>

                <button
                  onClick={placeOrder}
                  disabled={createOrder.isPending}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {createOrder.isPending ? t("loading") : t("placeOrder")}
                </button>
              </>
            )}
          </div>
        )}

        {/* Tracking view */}
        {view === "tracking" && (
          <div className="p-4 pb-6">
            {activeOrder ? (
              <OrderTracker order={activeOrder as unknown as OrderWithItems} tableId={table.id} />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-2">📋</div>
                <p>{t("noData")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customize modal */}
      {customizeItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-foreground mb-3">
              {getLangName(customizeItem.dish as unknown as Record<string, unknown>)}
            </h3>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t("specialRequest")}</label>
            <textarea
              value={customizeItem.note}
              onChange={(e) => setCustomizeItem({ ...customizeItem, note: e.target.value })}
              placeholder="ex: sans sel, bien cuit..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setCustomizeItem(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent">
                {t("cancel")}
              </button>
              <button onClick={confirmAddToCart}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
                {t("addToCart")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
