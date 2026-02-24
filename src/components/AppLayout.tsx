import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Store,
  Users,
  LogOut,
  Truck,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { path: "/nova-operacao", label: "Nova Operação", icon: PlusCircle, roles: ["admin", "motorista"] },
  { path: "/historico", label: "Histórico", icon: History, roles: ["admin", "motorista"] },
  { path: "/lojas", label: "Lojas", icon: Store, roles: ["admin"] },
  { path: "/motoristas", label: "Motoristas", icon: Users, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-sidebar-foreground">M.A Transportes</h2>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {filteredNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">M.A Transportes</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="lg:hidden bg-card border-b border-border p-3 space-y-1 animate-fade-in">
            {filteredNav.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active ? "bg-secondary text-primary" : "text-foreground/70 hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-secondary transition"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
