import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useListCategories,
  useListDishes,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateDish,
  useUpdateDish,
  useDeleteDish,
  useToggleDishAvailability,
  useReorderCategories,
  getListCategoriesQueryKey,
  getListDishesQueryKey,
} from "@workspace/api-client-react";
import type { Category, Dish } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCategoryItem({
  cat,
  isActive,
  onClick,
  onDelete,
}: {
  cat: Category;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cat.id });
  const lang = i18n.language as "fr" | "en" | "ar";
  const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";
  const name = (cat as unknown as Record<string, string>)[nameKey] || cat.nameEn;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors ${
        isActive ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">⠿</span>
      <span className="flex-1 text-sm font-medium" onClick={onClick}>{name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
        className="text-xs text-destructive hover:opacity-70"
      >✕</button>
    </div>
  );
}

function DishModal({
  dish,
  categories,
  onClose,
  onSave,
}: {
  dish?: Dish;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    categoryId: dish?.categoryId ?? (categories[0]?.id ?? 0),
    nameAr: dish?.nameAr ?? "",
    nameFr: dish?.nameFr ?? "",
    nameEn: dish?.nameEn ?? "",
    descriptionAr: dish?.descriptionAr ?? "",
    descriptionFr: dish?.descriptionFr ?? "",
    descriptionEn: dish?.descriptionEn ?? "",
    price: dish?.price ?? 0,
    imageUrl: dish?.imageUrl ?? "",
    isPopular: dish?.isPopular ?? false,
    isNew: dish?.isNew ?? false,
    isAvailable: dish?.isAvailable ?? true,
    allergens: dish?.allergens?.join(", ") ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg my-4">
        <h3 className="font-semibold text-foreground mb-4">{dish ? t("edit") : t("addDish")}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t("category")}</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameFr || c.nameEn}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["nameFr", "nameEn", "nameAr"] as const).map((k) => (
              <div key={k}>
                <label className="block text-xs font-medium text-foreground mb-1">{k === "nameFr" ? "FR" : k === "nameEn" ? "EN" : "AR"}</label>
                <input value={(form as Record<string, unknown>)[k] as string}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  dir={k === "nameAr" ? "rtl" : "ltr"}
                  className="w-full px-2 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["descriptionFr", "descriptionEn", "descriptionAr"] as const).map((k) => (
              <div key={k}>
                <textarea value={(form as Record<string, unknown>)[k] as string}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  dir={k === "descriptionAr" ? "rtl" : "ltr"}
                  rows={2}
                  className="w-full px-2 py-2 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{t("price")} (€)</label>
              <input type="number" step="0.01" min="0" value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{t("allergens")} (comma sep.)</label>
              <input value={form.allergens}
                onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t("imageUrl")}</label>
            <input value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex gap-4">
            {(["isPopular", "isNew", "isAvailable"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={(form as Record<string, unknown>)[k] as boolean}
                  onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                  className="rounded" />
                {t(k === "isPopular" ? "isPopular" : k === "isNew" ? "isNew" : "available")}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent">
            {t("cancel")}
          </button>
          <button onClick={() => onSave({
            ...form,
            price: Number(form.price),
            allergens: form.allergens ? form.allergens.split(",").map((s) => s.trim()).filter(Boolean) : [],
            imageUrl: form.imageUrl || null,
            descriptionAr: form.descriptionAr || null,
            descriptionFr: form.descriptionFr || null,
            descriptionEn: form.descriptionEn || null,
          })}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMenu() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const lang = i18n.language as "fr" | "en" | "ar";
  const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as "nameEn" | "nameFr" | "nameAr";

  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [catOrder, setCatOrder] = useState<number[]>([]);
  const [dishModal, setDishModal] = useState<"add" | Dish | null>(null);
  const [newCatName, setNewCatName] = useState({ fr: "", en: "", ar: "" });
  const [showAddCat, setShowAddCat] = useState(false);

  const { data: rawCategories = [] } = useListCategories({ includeInactive: true });
  const categories = rawCategories as Category[];

  const orderedCategories = catOrder.length > 0
    ? [...categories].sort((a, b) => catOrder.indexOf(a.id) - catOrder.indexOf(b.id))
    : categories;

  const activeCatId = selectedCat ?? (orderedCategories[0]?.id ?? null);
  const { data: rawDishes = [] } = useListDishes(activeCatId ? { categoryId: activeCatId } : {});
  const dishes = rawDishes as Dish[];

  const sensors = useSensors(useSensor(PointerSensor));
  const invalidateCats = () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
  const invalidateDishes = () => queryClient.invalidateQueries({ queryKey: getListDishesQueryKey() });

  const createCatMutation = useCreateCategory();
  const deleteCatMutation = useDeleteCategory();
  const reorderMutation = useReorderCategories();
  const createDishMutation = useCreateDish();
  const updateDishMutation = useUpdateDish();
  const deleteDishMutation = useDeleteDish();
  const toggleDishMutation = useToggleDishAvailability();

  const handleCatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCategories.findIndex((c) => c.id === active.id);
    const newIndex = orderedCategories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(orderedCategories, oldIndex, newIndex);
    setCatOrder(reordered.map((c) => c.id));
    reorderMutation.mutate({
      data: { items: reordered.map((c, i) => ({ id: c.id, orderIndex: i + 1 })) },
    }, { onSuccess: invalidateCats });
  };

  const addCategory = () => {
    if (!newCatName.fr) { toast.error("French name required"); return; }
    createCatMutation.mutate(
      { data: { nameFr: newCatName.fr, nameEn: newCatName.en || newCatName.fr, nameAr: newCatName.ar || newCatName.fr, icon: "utensils" } },
      { onSuccess: () => { invalidateCats(); setNewCatName({ fr: "", en: "", ar: "" }); setShowAddCat(false); toast.success(t("success")); }, onError: () => toast.error(t("error")) }
    );
  };

  const deleteCategory = (id: number) => {
    if (!confirm("Delete this category?")) return;
    deleteCatMutation.mutate({ id }, {
      onSuccess: () => { invalidateCats(); if (selectedCat === id) setSelectedCat(null); toast.success(t("success")); },
      onError: () => toast.error(t("error")),
    });
  };

  const saveDish = (data: Record<string, unknown>) => {
    if (dishModal === "add") {
      createDishMutation.mutate(
        { data: { categoryId: activeCatId!, ...data } as Parameters<typeof createDishMutation.mutate>[0]["data"] },
        { onSuccess: () => { invalidateDishes(); setDishModal(null); toast.success(t("success")); }, onError: () => toast.error(t("error")) }
      );
    } else if (dishModal && typeof dishModal === "object") {
      updateDishMutation.mutate(
        { id: (dishModal as Dish).id, data },
        { onSuccess: () => { invalidateDishes(); setDishModal(null); toast.success(t("success")); }, onError: () => toast.error(t("error")) }
      );
    }
  };

  const deleteDish = (id: number) => {
    if (!confirm("Delete this dish?")) return;
    deleteDishMutation.mutate({ id }, {
      onSuccess: () => { invalidateDishes(); toast.success(t("success")); },
      onError: () => toast.error(t("error")),
    });
  };

  const toggleDish = (id: number) => {
    toggleDishMutation.mutate({ id }, { onSuccess: invalidateDishes, onError: () => toast.error(t("error")) });
  };

  return (
    <div className="flex h-full">
      {/* Category sidebar */}
      <div className="w-52 border-e border-border bg-card/50 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("menu")}</span>
          <button onClick={() => setShowAddCat(true)}
            className="text-primary hover:opacity-70 text-lg leading-none">+</button>
        </div>

        {showAddCat && (
          <div className="p-2 border-b border-border space-y-1.5">
            {(["fr", "en", "ar"] as const).map((l) => (
              <input key={l} value={newCatName[l]}
                onChange={(e) => setNewCatName({ ...newCatName, [l]: e.target.value })}
                placeholder={`Name (${l.toUpperCase()})`}
                dir={l === "ar" ? "rtl" : "ltr"}
                className="w-full px-2 py-1.5 rounded-md bg-background border border-input text-xs text-foreground focus:outline-none" />
            ))}
            <div className="flex gap-1">
              <button onClick={addCategory} className="flex-1 py-1 bg-primary text-white rounded text-xs">{t("add")}</button>
              <button onClick={() => setShowAddCat(false)} className="flex-1 py-1 border border-border rounded text-xs text-foreground">{t("cancel")}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
            <SortableContext items={orderedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {orderedCategories.map((cat) => (
                <SortableCategoryItem
                  key={cat.id}
                  cat={cat}
                  isActive={activeCatId === cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  onDelete={deleteCategory}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Dish list */}
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {activeCatId ? (orderedCategories.find((c) => c.id === activeCatId) as unknown as Record<string, string>)?.[nameKey] || t("menu") : t("menu")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{dishes.length} dishes</p>
          </div>
          <button onClick={() => setDishModal("add")}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">
            {t("addDish")}
          </button>
        </div>

        <div className="p-4 space-y-2">
          {dishes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-2">🍽</div>
              <p>{t("noData")}</p>
            </div>
          ) : (
            dishes.map((dish) => {
              const name = (dish as unknown as Record<string, string>)[nameKey] || dish.nameEn;
              return (
                <div key={dish.id} className={`flex items-center gap-3 p-3 bg-card border border-border rounded-xl ${!dish.isAvailable ? "opacity-60" : ""}`}>
                  {dish.imageUrl ? (
                    <img src={dish.imageUrl} alt={name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center text-xl">🍽</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-foreground truncate">{name}</p>
                      {dish.isPopular && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">★</span>}
                      {dish.isNew && <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">NEW</span>}
                    </div>
                    <p className="text-primary text-sm font-semibold">{Number(dish.price).toFixed(2)} €</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleDish(dish.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        dish.isAvailable
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-muted border-border text-muted-foreground"
                      }`}>
                      {dish.isAvailable ? "●" : "○"}
                    </button>
                    <button onClick={() => setDishModal(dish)}
                      className="text-xs px-2.5 py-1.5 border border-border rounded-lg text-foreground hover:bg-accent">
                      {t("edit")}
                    </button>
                    <button onClick={() => deleteDish(dish.id)}
                      className="text-xs px-2.5 py-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                      {t("delete")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {dishModal !== null && (
        <DishModal
          dish={dishModal === "add" ? undefined : dishModal as Dish}
          categories={orderedCategories}
          onClose={() => setDishModal(null)}
          onSave={saveDish}
        />
      )}
    </div>
  );
}
