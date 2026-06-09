import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useTheme } from "next-themes";
import i18n from "@/i18n";
import { toast } from "sonner";
import { useLogout } from "@workspace/api-client-react";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    dashboard: "▣",
    menu: "☰",
    tables: "⊞",
    orders: "◈",
    users: "◎",
    stats: "◉",
    history: "◷",
    availability: "◐",
    logout: "⏻",
    sun: "☀",
    moon: "☾",
    lang: "⊕",
    bars: "≡",
    close: "✕",
  };
  return <span className="text-base">{icons[name] ?? "•"}</span>;
}

function LanguageSwitcher() {
  const { t } = useTranslation();
  const langs = [
    { code: "fr", label: "FR" },
    { code: "en", label: "EN" },
    { code: "ar", label: "ع" },
  ];
  const current = i18n.language;

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("lang", code);
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => switchLang(l.code)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            current === l.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default function Layout({ children, navItems }: { children: ReactNode; navItems: NavItem[] }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        navigate("/login");
        toast.success("Logged out");
      },
    });
  };

  const roleColor = {
    admin: "bg-purple-500/20 text-purple-400",
    vendor: "bg-blue-500/20 text-blue-400",
    client: "bg-green-500/20 text-green-400",
  }[user?.role ?? "client"] ?? "bg-muted text-muted-foreground";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">R</span>
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">RestaurantOS</p>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
        </div>
        <div className="mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor}`}>
            {t(user?.role ?? "client")}
          </span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { e.preventDefault(); navigate(item.href); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {theme === "dark" ? <Icon name="sun" /> : <Icon name="moon" />}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Icon name="logout" />
          {t("logout")}
        </button>
      </div>
      <div className="px-3 py-2 border-t border-border/50">
        <p className="text-center text-xs text-muted-foreground/40 tracking-wider">
          ✦ <span className="text-primary/50 font-medium">Meghraoui Chiheb</span> ✦
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-e border-border bg-card flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-card border-e border-border">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 end-3 p-1 text-muted-foreground hover:text-foreground"
            >
              <Icon name="close" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-muted-foreground hover:text-foreground">
            <Icon name="bars" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <span className="font-semibold text-sm">RestaurantOS</span>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Icon name="sun" /> : <Icon name="moon" />}
          </button>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="hidden lg:flex items-center justify-center py-2 border-t border-border bg-card/50">
          <p className="text-xs text-muted-foreground/50 tracking-widest uppercase font-medium">
            Developed by <span className="text-primary/70 font-semibold">Meghraoui Chiheb</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
