import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400",
  vendor: "bg-blue-500/20 text-blue-400",
  client: "bg-green-500/20 text-green-400",
};

type FormData = { name: string; email: string; password: string; role: "client" | "vendor" | "admin"; langPref: "fr" | "en" | "ar" };

function UserModal({
  user,
  onClose,
  onSave,
}: {
  user?: User;
  onClose: () => void;
  onSave: (data: Partial<FormData>) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormData>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: (user?.role as FormData["role"]) ?? "vendor",
    langPref: ((user?.langPref as FormData["langPref"]) ?? "fr"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-foreground mb-4">{user ? t("edit") : t("addUser")}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t("name")}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t("email")}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t("password")} {user ? "(leave blank to keep)" : ""}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t("role")}</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as FormData["role"] })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="vendor">{t("vendor")}</option>
              <option value="admin">{t("admin")}</option>
              <option value="client">{t("client")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t("language")}</label>
            <select value={form.langPref} onChange={(e) => setForm({ ...form, langPref: e.target.value as FormData["langPref"] })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent">
            {t("cancel")}
          </button>
          <button onClick={() => {
            const data: Partial<FormData> = { name: form.name, email: form.email, role: form.role, langPref: form.langPref };
            if (form.password) data.password = form.password;
            onSave(data);
          }}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"add" | User | null>(null);

  const { data: users = [], isLoading } = useListUsers({});
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleSave = (data: Partial<FormData>) => {
    if (modal === "add") {
      createMutation.mutate(
        { data: data as Parameters<typeof createMutation.mutate>[0]["data"] },
        { onSuccess: () => { invalidate(); setModal(null); toast.success(t("success")); }, onError: () => toast.error(t("error")) }
      );
    } else if (modal && typeof modal === "object") {
      updateMutation.mutate(
        { id: (modal as User).id, data },
        { onSuccess: () => { invalidate(); setModal(null); toast.success(t("success")); }, onError: () => toast.error(t("error")) }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this user?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { invalidate(); toast.success(t("success")); },
      onError: () => toast.error(t("error")),
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("users")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{(users as User[]).length} registered users</p>
        </div>
        <button onClick={() => setModal("add")}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">
          {t("addUser")}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("name")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("email")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("role")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("language")}</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("date")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(users as User[]).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t("noData")}</td></tr>
              ) : (
                (users as User[]).map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? ""}`}>
                        {t(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{user.langPref ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModal(user)}
                          className="text-xs px-2 py-1 border border-border rounded text-foreground hover:bg-accent">
                          {t("edit")}
                        </button>
                        <button onClick={() => handleDelete(user.id)}
                          className="text-xs px-2 py-1 text-destructive hover:bg-destructive/10 rounded">
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <UserModal
          user={modal === "add" ? undefined : modal as User}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
