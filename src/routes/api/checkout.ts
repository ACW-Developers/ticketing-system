import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const cartSchema = z.object({
  eventId: z.string().uuid(),
  origin: z.string().url(),
  items: z.array(
    z.object({
      type: z.enum(["children", "regular", "vip", "vvip"]),
      quantity: z.number().int().min(1).max(20),
    })
  ).min(1).max(8),
  attendee: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(6).max(20),
  }),
});

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
  return { supabase, userId: data.claims.sub as string, email: data.claims.email as string | undefined };
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (!stripeKey) return new Response("STRIPE_SECRET_KEY not configured", { status: 500 });

          const { supabase, userId, email } = await authUser(request);
          const body = await request.json();
          const data = cartSchema.parse(body);

          const { data: event, error: evErr } = await supabase
            .from("events").select("*").eq("id", data.eventId).maybeSingle();
          if (evErr || !event) return new Response("Event not found", { status: 404 });

          const priceMap = {
            children: Number(event.price_children),
            regular: Number(event.price_regular),
            vip: Number(event.price_vip),
            vvip: Number(event.price_vvip),
          };
          const labelMap = { children: "Children", regular: "Regular", vip: "VIP", vvip: "VVIP" };

          let total = 0;
          const lineItems = data.items.map((it) => {
            const unit = priceMap[it.type];
            if (!unit || unit <= 0) throw new Error(`${it.type} tickets not available`);
            total += unit * it.quantity;
            return {
              quantity: it.quantity,
              price_data: {
                currency: "usd",
                unit_amount: Math.round(unit * 100),
                product_data: {
                  name: `${event.title} - ${labelMap[it.type]}`,
                  description: event.venue,
                },
              },
            };
          });

          const stripe = new Stripe(stripeKey, {
            apiVersion: "2024-09-30.acacia" as any,
            httpClient: Stripe.createFetchHttpClient(),
          });

          const { data: order, error: oErr } = await supabase
            .from("orders").insert({
              user_id: userId,
              event_id: data.eventId,
              total_amount: total,
              currency: "usd",
              status: "pending",
            }).select().single();
          if (oErr || !order) return new Response("Failed to create order", { status: 500 });

          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: lineItems,
            customer_email: data.attendee.email || email,
            phone_number_collection: { enabled: true },
            billing_address_collection: "auto",
            success_url: `${data.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${data.origin}/events/${data.eventId}`,
            metadata: {
              order_id: order.id,
              event_id: data.eventId,
              user_id: userId,
              items: JSON.stringify(data.items),
              attendee_name: data.attendee.name,
              attendee_email: data.attendee.email,
              attendee_phone: data.attendee.phone,
            },
          });

          await supabase.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

          return Response.json({ url: session.url, sessionId: session.id });
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error("checkout error", e);
          return new Response(e?.message ?? "Checkout failed", { status: 400 });
        }
      },
    },
  },
});
