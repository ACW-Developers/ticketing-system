import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

async function authUser(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response("Unauthorized", { status: 401 });
  const token = auth.slice(7);
  const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Response("Unauthorized", { status: 401 });
  return { supabase, userId: data.claims.sub as string };
}

export const Route = createFileRoute("/api/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (!stripeKey) return new Response("STRIPE_SECRET_KEY not configured", { status: 500 });

          const { supabase, userId } = await authUser(request);
          const body = await request.json();
          const { sessionId } = z.object({ sessionId: z.string() }).parse(body);

          const stripe = new Stripe(stripeKey, {
            apiVersion: "2024-09-30.acacia" as any,
            httpClient: Stripe.createFetchHttpClient(),
          });
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status !== "paid") return Response.json({ status: "pending" });

          const { data: order } = await supabase
            .from("orders").select("*").eq("stripe_session_id", sessionId).maybeSingle();
          if (!order) return new Response("Order not found", { status: 404 });
          if (order.user_id !== userId) return new Response("Unauthorized", { status: 403 });

          if (order.status === "paid") {
            const { data: tickets } = await supabase.from("tickets").select("*").eq("order_id", order.id);
            return Response.json({ status: "paid", order, tickets: tickets ?? [] });
          }

          const admin = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } }
          );

          const meta = session.metadata ?? {};
          const items = JSON.parse(meta.items ?? "[]") as Array<{ type: string; quantity: number }>;
          const { data: event } = await admin.from("events").select("*").eq("id", order.event_id).single();
          if (!event) return new Response("Event missing", { status: 404 });

          const priceMap: Record<string, number> = {
            children: Number(event.price_children),
            regular: Number(event.price_regular),
            vip: Number(event.price_vip),
            vvip: Number(event.price_vvip),
          };

          const ticketsToInsert: any[] = [];
          for (const it of items) {
            for (let i = 0; i < it.quantity; i++) {
              const num = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
              ticketsToInsert.push({
                order_id: order.id,
                event_id: order.event_id,
                user_id: userId,
                ticket_type: it.type,
                ticket_number: num,
                attendee_name: meta.attendee_name ?? null,
                attendee_email: meta.attendee_email ?? null,
                attendee_phone: meta.attendee_phone ?? null,
                price: priceMap[it.type],
              });
            }
          }

          const { data: inserted, error: tErr } = await admin.from("tickets").insert(ticketsToInsert).select();
          if (tErr) return new Response("Failed to issue tickets: " + tErr.message, { status: 500 });

          await admin.from("orders").update({ status: "paid" }).eq("id", order.id);

          return Response.json({ status: "paid", order: { ...order, status: "paid" }, tickets: inserted ?? [] });
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error("verify error", e);
          return new Response(e?.message ?? "Verify failed", { status: 400 });
        }
      },
    },
  },
});
