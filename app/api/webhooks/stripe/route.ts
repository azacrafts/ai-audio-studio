import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[Stripe webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? session.client_reference_id;

        if (!userId) break;

        if (session.metadata?.type === "tokens") {
          // Token top-up purchase
          const tokenAmount = parseInt(session.metadata.token_amount ?? "0", 10);
          if (tokenAmount > 0) {
            await supabase.rpc("increment_tokens", {
              p_user_id: userId,
              p_amount: tokenAmount,
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;

        if (!userId) break;

        const plan = getPlanFromSubscription(sub);

        const periodEnd =
          "current_period_end" in sub
            ? new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
            : null;

        // Upsert subscription record
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_sub_id: sub.id,
          plan,
          status: sub.status,
          current_period_end: periodEnd,
        });

        // Update user plan
        if (sub.status === "active") {
          await supabase.from("users").update({ plan }).eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;

        if (!userId) break;

        // Downgrade to free
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_sub_id", sub.id);

        await supabase.from("users").update({ plan: "free" }).eq("id", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
        };
        const rawSub = invoice.subscription;
        const subId = typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;

        if (subId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_sub_id", subId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function getPlanFromSubscription(sub: Stripe.Subscription): string {
  const priceId = sub.items.data[0]?.price.id ?? "";
  if (priceId === process.env.STRIPE_PRICE_CREATOR) return "creator";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  // Fallback: check metadata or product name
  return sub.metadata?.plan ?? "creator";
}
