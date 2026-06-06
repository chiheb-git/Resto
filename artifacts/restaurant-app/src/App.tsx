import "./i18n";
import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import i18n from "@/i18n";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import MenuPage from "@/pages/menu/MenuPage";
import VendorDashboard from "@/pages/vendor/VendorDashboard";
import VendorMenu from "@/pages/vendor/VendorMenu";
import VendorHistory from "@/pages/vendor/VendorHistory";
import VendorPayment from "@/pages/vendor/VendorPayment";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminMenu from "@/pages/admin/AdminMenu";
import AdminTables from "@/pages/admin/AdminTables";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminStats from "@/pages/admin/AdminStats";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
setBaseUrl(`${BASE}`);
setAuthTokenGetter(() => localStorage.getItem("token"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } },
});

function VendorLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const nav = [
    { label: "Kanban", href: "/vendor", icon: "▣" },
    { label: t("availability"), href: "/vendor/menu", icon: "◉" },
    { label: t("history"), href: "/vendor/history", icon: "◷" },
    { label: "Paiements", href: "/vendor/payment", icon: "💳" },
  ];
  return <Layout navItems={nav}>{children}</Layout>;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const nav = [
    { label: t("dashboard"), href: "/admin", icon: "▣" },
    { label: t("menu"), href: "/admin/menu", icon: "⚙" },
    { label: t("tables"), href: "/admin/tables", icon: "⊞" },
    { label: t("users"), href: "/admin/users", icon: "◎" },
    { label: t("statistics"), href: "/admin/stats", icon: "◉" },
  ];
  return <Layout navItems={nav}>{children}</Layout>;
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: ("admin" | "vendor" | "client")[] }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isLoading && !user) { navigate("/login"); }
    else if (!isLoading && user && roles && !roles.includes(user.role)) {
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "vendor") navigate("/vendor");
      else navigate("/login");
    }
  }, [user, isLoading, roles]);
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (isLoading) return;
    if (!user) navigate("/login");
    else if (user.role === "admin") navigate("/admin");
    else if (user.role === "vendor") navigate("/vendor");
  }, [user, isLoading]);
  return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
}

function LangSync() {
  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [i18n.language]);
  return null;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/menu/:token" component={MenuPage} />
      <Route path="/vendor"><ProtectedRoute roles={["vendor", "admin"]}><VendorLayout><VendorDashboard /></VendorLayout></ProtectedRoute></Route>
      <Route path="/vendor/menu"><ProtectedRoute roles={["vendor", "admin"]}><VendorLayout><VendorMenu /></VendorLayout></ProtectedRoute></Route>
      <Route path="/vendor/payment"><ProtectedRoute roles={["vendor", "admin"]}><VendorLayout><VendorPayment /></VendorLayout></ProtectedRoute></Route>
      <Route path="/vendor/history"><ProtectedRoute roles={["vendor", "admin"]}><VendorLayout><VendorHistory /></VendorLayout></ProtectedRoute></Route>
      <Route path="/admin"><ProtectedRoute roles={["admin"]}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute></Route>
      <Route path="/admin/menu"><ProtectedRoute roles={["admin"]}><AdminLayout><AdminMenu /></AdminLayout></ProtectedRoute></Route>
      <Route path="/admin/tables"><ProtectedRoute roles={["admin"]}><AdminLayout><AdminTables /></AdminLayout></ProtectedRoute></Route>
      <Route path="/admin/users"><ProtectedRoute roles={["admin"]}><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute></Route>
      <Route path="/admin/stats"><ProtectedRoute roles={["admin"]}><AdminLayout><AdminStats /></AdminLayout></ProtectedRoute></Route>
      <Route><div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-foreground">404</h1><p className="text-muted-foreground mt-2">Page not found</p><a href="/" className="text-primary hover:underline mt-4 block">Go home</a></div></div></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <AuthProvider>
          <WouterRouter base={BASE}>
            <LangSync />
            <AppRoutes />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}