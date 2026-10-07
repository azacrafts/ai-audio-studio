import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, TOKEN_PACKS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments not configured. Add STRIPE_SECRET_KEY to .env.local" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Must be signed in to upgrade" }, { status: 401 });
  }

  const body = await req.json();
  const { plan, tokenPack } = body as { plan?: string; tokenPack?: number };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    if (plan && plan in PLANS) {
      // Subscription checkout
      const planConfig = PLANS[plan as keyof typeof PLANS];

      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        client_reference_id: user.id,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: planConfig.priceId,
            quantity: 1,
          },
        ],
        metadata: {
          user_id: user.id,
          plan,
        },
        success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
        cancel_url: `${appUrl}/pricing?canceled=1`,
        allow_promotion_codes: true,
      });

      return NextResponse.json({ checkoutUrl: session.url });
    }

    if (tokenPack !== undefined) {
      // Token top-up — one-time payment
      const pack = TOKEN_PACKS[tokenPack];
      if (!pack) {
        return NextResponse.json({ error: "Invalid token pack" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        client_reference_id: user.id,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: pack.price,
              product_data: {
                name: `${pack.label} — ${pack.tokens} generations`,
                description: `${pack.tokens} extra AI audio generations`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: user.id,
          token_amount: pack.tokens,
          type: "tokens",
        },
        success_url: `${appUrl}/success?tokens=${pack.tokens}`,
        cancel_url: `${appUrl}/pricing?canceled=1`,
      });

      return NextResponse.json({ checkoutUrl: session.url });
    }

    return NextResponse.json({ error: "Specify plan or tokenPack" }, { status: 400 });
  } catch (err) {
    console.error("[/api/checkout] Stripe error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}

// GET — simple redirect handler used from pricing page links
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan");

  if (!plan) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  // Redirect to auth if needed, then back to checkout
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL("/auth", req.url);
    url.searchParams.set("redirect", `/api/checkout?plan=${plan}`);
    return NextResponse.redirect(url);
  }

  // For GET we can't create session without POST body, redirect to pricing
  return NextResponse.redirect(new URL(`/pricing?upgrade=${plan}`, req.url));
}
