import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { verifyPayment } from "@/lib/checkout.functions";
import { CheckCircle2, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccess,
  validateSearch: (s: Record<string, unknown>) => ({ session_id: (s.session_id as string) ?? "" }),
});

function CheckoutSuccess() {
  const { session_id } = useSearch({ from: "/checkout/success" });
  const verify = useServerFn(verifyPayment);
  const [state, setState] = useState<"verifying" | "paid" | "pending" | "error">("verifying");
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!session_id) { setState("error"); return; }
    verify({ data: { sessionId: session_id } })
      .then((res) => {
        if (res.status === "paid") {
          setTickets(res.tickets ?? []);
          setState("paid");
        } else setState("pending");
      })
      .catch((e) => { toast.error(e?.message ?? "Verification failed"); setState("error"); });
  }, [session_id]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        <div className="surface-card rounded-2xl p-10 text-center">
          {state === "verifying" && (<><Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" /><p>Confirming your payment…</p></>)}
          {state === "paid" && (
            <>
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/15 text-primary mb-4 glow-neon">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-2">You're in.</h1>
              <p className="text-muted-foreground mb-6">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} issued. They're saved to your account.</p>
              <div className="grid gap-2 mb-6 text-left max-h-64 overflow-y-auto">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-2 text-sm">
                    <span className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> {t.ticket_type.toUpperCase()}</span>
                    <code className="text-xs text-muted-foreground">{t.ticket_number}</code>
                  </div>
                ))}
              </div>
              <Link to="/my-tickets"><Button className="glow-neon">View my tickets</Button></Link>
            </>
          )}
          {state === "pending" && <><p>Payment is still processing. Refresh in a moment.</p></>}
          {state === "error" && <><p>We couldn't verify your payment.</p><Link to="/events" className="text-primary text-sm">Back to events</Link></>}
        </div>
      </div>
    </Layout>
  );
}
