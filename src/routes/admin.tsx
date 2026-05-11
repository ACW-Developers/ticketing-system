import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, BarChart3, CalendarDays, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — Pulse" }] }),
});

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (!isAdmin) nav({ to: "/events" });
  }, [loading, user, isAdmin, nav]);

  if (loading || !user || !isAdmin)
    return <Layout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div></Layout>;

  const tabs = [
    { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
    { to: "/admin/events", label: "Events", icon: CalendarDays },
    { to: "/admin/attendees", label: "Attendees", icon: Users },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-1 border-b border-border mb-8 -mx-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
        </div>
        <Outlet />
      </div>
    </Layout>
  );
}
