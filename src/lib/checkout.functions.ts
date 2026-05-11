import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";

const cartSchema = z.object({
  eventId: z.string().uuid(),
  origin: z.string().url(),
  items: z.array(
    z.object({
      type: z.enum(["children", "regular", "vip", "vvip"]),
      quantity: z.number().int().min(1).max(20),
    })
  ).min(1).max(8),
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => cartSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    // Fetch event with prices
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr || !event) throw new Error("Event not found");

    const priceMap = {
      children: Number(event.price_children),
      regular: Number(event.price_regular),
      vip: Number(event.price_vip),
      vvip: Number(event.price_vvip),
    };
    const labelMap = {
      children: "Children",
      regular: "Regular",
      vip: "VIP",
      vvip: "VVIP",
    };

    let total = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map((it) => {
      const unit = priceMap[it.type];
      if (!unit || unit <= 0) throw new Error(`${it.type} tickets not available`);
      total += unit * it.quantity;
      return {
        quantity: it.quantity,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(unit * 100),
          product_data: {
            name: `${event.title} — ${labelMap[it.type]}`,
            description: event.venue,
          },
        },
      };
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-09-30.acacia" as any });

    // Create pending order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        event_id: data.eventId,
        total_amount: total,
        currency: "usd",
        status: "pending",
      })
      .select()
      .single();
    if (oErr || !order) throw new Error("Failed to create order");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: claims.email as string | undefined,
      success_url: `${data.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/events/${data.eventId}`,
      metadata: {
        order_id: order.id,
        event_id: data.eventId,
        user_id: userId,
        items: JSON.stringify(data.items),
      },
    });

    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return { url: session.url, sessionId: session.id };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ sessionId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-09-30.acacia" as any });
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);

    if (session.payment_status !== "paid") {
      return { status: "pending" as const };
    }

    // Get order
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.user_id !== userId) throw new Error("Unauthorized");

    if (order.status === "paid") {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("order_id", order.id);
      return { status: "paid" as const, order, tickets: tickets ?? [] };
    }

    // Use service role to insert tickets (RLS allows owner too, but be safe)
    const adminUrl = process.env.SUPABASE_URL!;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(adminUrl, adminKey, { auth: { persistSession: false } });

    // Get profile for attendee name
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, phone, email")
      .eq("user_id", userId)
      .maybeSingle();

    const items = JSON.parse(session.metadata?.items ?? "[]") as Array<{ type: string; quantity: number }>;
    const { data: event } = await admin.from("events").select("*").eq("id", order.event_id).single();
    if (!event) throw new Error("Event missing");
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
          attendee_name: profile?.full_name ?? null,
          attendee_email: profile?.email ?? null,
          attendee_phone: profile?.phone ?? null,
          price: priceMap[it.type],
        });
      }
    }

    const { data: inserted, error: tErr } = await admin
      .from("tickets")
      .insert(ticketsToInsert)
      .select();
    if (tErr) throw new Error("Failed to issue tickets: " + tErr.message);

    await admin.from("orders").update({ status: "paid" }).eq("id", order.id);

    return { status: "paid" as const, order: { ...order, status: "paid" }, tickets: inserted ?? [] };
  });
