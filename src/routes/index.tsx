import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { EventCard, type EventCardData } from "@/components/EventCard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Calendar, Shield, QrCode, BarChart3, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Pulse — Modern Event Ticketing" },
      { name: "description", content: "Discover, book, and manage event tickets with secure Stripe checkout, instant QR tickets, and a beautiful admin dashboard." },
      { property: "og:title", content: "Pulse — Modern Event Ticketing" },
      { property: "og:description", content: "Discover, book, and manage event tickets with instant QR delivery." },
    ],
  }),
});

function Index() {
  const [featured, setFeatured] = useState<EventCardData[] | null>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("id,title,description,event_date,venue,poster_url,price_regular")
      .eq("status", "published")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(6)
      .then(({ data }) => setFeatured((data ?? []) as EventCardData[]));
  }, []);

  return (
    <Layout>
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="container mx-auto px-4 py-24 md:py-36 relative">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/50 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Cloud-native ticketing built for unforgettable nights
            </div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.95]">
              Tickets that <span className="gradient-neon-text">pulse</span>
              <br /> with the moment.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
              Discover tonight's headliners, book in seconds with secure checkout, and walk in with a QR ticket that just works.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/events">
                <Button size="lg" className="glow-neon h-12 px-6 text-base">
                  Browse events <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                  Create account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Featured events</h2>
            <p className="mt-2 text-muted-foreground">Tap any event to see details and grab tickets.</p>
          </div>
          <Link to="/events" className="hidden sm:inline-flex items-center text-sm text-primary hover:underline">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        {featured === null ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
        ) : featured.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">No upcoming events yet — check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Calendar, title: "Curated lineup", desc: "From intimate gigs to stadium nights — all in one feed." },
            { icon: Shield, title: "Secure checkout", desc: "Stripe-powered payments with instant confirmation." },
            { icon: QrCode, title: "Instant QR tickets", desc: "Tickets delivered the moment payment clears." },
            { icon: BarChart3, title: "Live analytics", desc: "Organizers track sales, revenue, and attendance in real time." },
          ].map((f) => (
            <div key={f.title} className="surface-card rounded-2xl p-6 hover:border-primary/40 transition-colors">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
