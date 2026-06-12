import { useTranslation } from "react-i18next";
import { getSocket } from "@/lib/socket";
import { useCurrency } from "@/lib/currency";
import { useEffect } from "react";
import { useListDishes, useToggleDishAvailability, getListDishesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import type { Dish } from "@workspace/api-client-react";

export default function VendorMenu() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const lang = i18n.language as "fr" | "en" | "ar";
  const { formatPrice } = useCurrency();
  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: getListDishesQueryKey() });
    getSocket().on("menu:updated", refresh);
    return () => { getSocket().off("menu:updated", refresh); };
  }, []);
  const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";

  const { data: dishes = [], isLoading } = useListDishes({});
  const toggleMutation = useToggleDishAvailability();

  const toggle = (id: number) => {
    toggleMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDishesQueryKey() });
          toast.success(t("success"));
        },
        onError: () => toast.error(t("error")),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">{t("availability")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("toggleAvailability")}</p>
      </div>

      <div className="space-y-2">
        {(dishes as Dish[]).map((dish) => {
          const name = (dish as unknown as Record<string, string>)[nameKey] || dish.nameEn;
          return (
            <div key={dish.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${dish.isAvailable ? "bg-card border-border" : "bg-muted/50 border-border opacity-70"}`}>
              <div className="flex items-center gap-3">
                {dish.imageUrl ? (
                  <img src={dish.imageUrl} alt={name} className="w-10 h-10 object-cover rounded-lg" />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg">??</div>
                )}
                <div>
                  <p className="font-medium text-sm text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(dish.price)}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(dish.id)}
                disabled={toggleMutation.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  dish.isAvailable ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  dish.isAvailable ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

