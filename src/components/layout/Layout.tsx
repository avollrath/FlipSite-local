import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";

export function Layout() {
  const { isDemoMode } = useAuth();
  const { mode, toggleMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem("flipsite-sidebar-collapsed");
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    localStorage.setItem(
      "flipsite-sidebar-collapsed",
      JSON.stringify(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  const sidebarWidth = sidebarCollapsed ? 'md:ml-16' : 'md:ml-72'

  return (
    <div className="min-h-screen text-base transition-colors bg-surface">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`flex-1 min-h-screen overflow-auto transition-all duration-200 ease-out ${sidebarWidth}`}>
        <header className="sticky top-0 z-30 border-b border-subtle bg-surface/85 backdrop-blur">
          <div className="h-16 px-5 md:px-8">
            <div className="flex h-full max-w-[2512px] items-center justify-between">
              <div aria-hidden="true" />
              <button
                type="button"
                className="grid w-10 h-10 transition border rounded-lg shadow-sm place-items-center border-layout bg-card text-muted hover:border-accent/40 hover:text-accent"
                onClick={toggleMode}
                aria-label="Toggle dark mode"
              >
                {mode === "dark" ? (
                  <Sun className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </header>
        {isDemoMode && (
          <div className="flex items-center justify-between w-full gap-3 px-4 py-2 text-xs border-b border-accent/20 bg-accent/10 md:px-8">
            <span className="font-medium text-accent">
              You are in demo mode - data is read-only
            </span>
            <button
              type="button"
              onClick={() => navigate("/login?tab=signup")}
              className="font-semibold text-accent hover:underline"
            >
              Create your account →
            </button>
          </div>
        )}
        <main className="px-5 py-8 pb-28 md:px-8 md:pb-8">
          <div key={location.pathname} className="animate-page-transition">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
