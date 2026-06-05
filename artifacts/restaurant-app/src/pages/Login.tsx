import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("admin@restaurant.com");
  const [password, setPassword] = useState("admin123");

  const mutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { data: { email, password } },
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
          <p className="text-muted-foreground text-sm mt-1">Professional Restaurant Management</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-foreground">{t("login")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="admin@restaurant.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
            >
              {mutation.isPending ? t("loading") : t("login")}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            <a href="/register" className="text-primary hover:underline">{t("register")}</a>
          </p>

          <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            <p>Demo — Admin: admin@restaurant.com / admin123</p>
            <p>Demo — Vendor: vendor@restaurant.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
