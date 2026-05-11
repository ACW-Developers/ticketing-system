import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, DollarSign, Ticket, Users, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ?? "bg-primary/15 text-primary"}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ events: 0, tickets: 0, revenue: 0, attendees: 0, upcoming: 0 });
  const [chart, setChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: events }, { data: tickets }, { data: orders }] = await Promise.all([
        supabase.from("events").select("id, title, event_date"),
        supabase.from("tickets").select("id, event_id, ticket_type, user_id"),
        supabase.from("orders").select("total_amount, status, event_id"),
      ]);
      const paid = (orders ?? []).filter((o) => o.status === "paid");
      const revenue = paid.reduce((s, o) => s + Number(o.total_amount), 0);
      const upcoming = (events ?? []).filter((e) => new Date(e.event_date) > new Date()).length;
      const uniqAttendees = new Set((tickets ?? []).map((t: any) => t.user_id)).size;
      setStats({ events: events?.length ?? 0, tickets: tickets?.length ?? 0, revenue, attendees: uniqAttendees, upcoming });

      const byEvent: Record<string, { name: string; tickets: number }> = {};
      for (const e of events ?? []) byEvent[e.id] = { name: e.title.slice(0, 15), tickets: 0 };
      for (const t of tickets ?? []) if (byEvent[t.event_id]) byEvent[t.event_id].tickets++;
      setChart(Object.values(byEvent).slice(0, 8));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview as of {format(new Date(), "MMM d, h:mm a")}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon={Calendar} label="Total events" value={stats.events} />
        <Stat icon={Calendar} label="Upcoming" value={stats.upcoming} accent="bg-accent/15 text-accent" />
        <Stat icon={Ticket} label="Tickets sold" value={stats.tickets} />
        <Stat icon={DollarSign} label="Revenue" value={`$${stats.revenue.toFixed(2)}`} />
        <Stat icon={Users} label="Attendees" value={stats.attendees} accent="bg-accent/15 text-accent" />
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold mb-4">Tickets per event</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
              <XAxis dataKey="name" stroke="oklch(0.68 0.02 240)" fontSize={12} />
              <YAxis stroke="oklch(0.68 0.02 240)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.21 0.018 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8 }} />
              <Bar dataKey="tickets" fill="oklch(0.88 0.20 175)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
