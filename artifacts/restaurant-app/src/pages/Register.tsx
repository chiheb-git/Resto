import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "vendor" as "client" | "vendor" | "admin" });

  const mutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { data: { ...form, langPref: "fr" as const } },
      {
        onSuccess: (data) => {
          login(data.token, data.user as Parameters<typeof login>[1]);
          const role = data.user.role;
          if (role === "admin") navigate("/admin");
          else if (role === "vendor") navigate("/vendor");
          else navigate("/");
        },
        onError: () => toast.error(t("error")),
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <span className="text-2xl text-white font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">RestaurantOS</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-foreground">{t("register")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("name")}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("email")}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("password")}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("role")}</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="vendor">{t("vendor")}</option>
                <option value="admin">{t("admin")}</option>
                <option value="client">{t("client")}</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
            >
              {mutation.isPending ? t("loading") : t("register")}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            <a href="/login" className="text-primary hover:underline">{t("login")}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
