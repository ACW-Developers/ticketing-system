import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";

export const Route = createFileRoute("/my-tickets")({
  component: MyTickets,
  head: () => ({ meta: [{ title: "My Tickets - Smarticketing" }] }),
});

function MyTickets() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("tickets")
        .select("*, events(title, event_date, venue, poster_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows(data ?? []);
      const map: Record<string, string> = {};
      for (const t of data ?? []) {
        map[t.id] = await QRCode.toDataURL(t.ticket_number, { width: 160, margin: 1, color: { dark: "#0a0e1a", light: "#ffffff" } });
      }
      setQrs(map);
      setBusy(false);
    })();
  }, [user]);

  if (busy) return <Layout><div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-display text-4xl font-bold mb-2">My tickets</h1>
        <p className="text-muted-foreground mb-8">Your QR is your entry. Show it at the door.</p>
        {rows.length === 0 ? (
          <div className="surface-card rounded-2xl p-10 text-center text-muted-foreground">
            No tickets yet. <Link to="/events" className="text-primary">Browse events</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {rows.map((t) => (
              <div key={t.id} className="surface-card rounded-2xl overflow-hidden flex">
                <div className="flex-1 p-5">
                  <div className="text-xs uppercase tracking-wider text-primary font-semibold">{t.ticket_type}</div>
                  <h3 className="font-display text-lg font-semibold mt-1 line-clamp-2">{t.events?.title}</h3>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{t.events?.event_date && format(new Date(t.events.event_date), "MMM d, h:mm a")}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{t.events?.venue}</div>
                  </div>
                  <div className="mt-3 text-[10px] font-mono break-all opacity-70">{t.ticket_number}</div>
                </div>
                <div className="w-32 bg-white p-2 flex items-center justify-center">
                  {qrs[t.id] && <img src={qrs[t.id]} alt="QR" className="w-full" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
