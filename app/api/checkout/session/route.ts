import { NextResponse } from "next/server";

import { BRAND_SLUG } from "@/lib/brand";
import { getStripeEnv, getSiteUrl } from "@/lib/env";
import { PLANS, type PlanId } from "@/lib/plans";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckoutPayload = {
  email?: string;
  name?: string;
  plan?: string;
  userId?: string | null;
};

function isJsonRequest(contentType: string | null) {
  return Boolean(contentType && contentType.includes("application/json"));
}

async function readPayload(request: Request): Promise<CheckoutPayload> {
  const contentType = request.headers.get("content-type");

  if (isJsonRequest(contentType)) {
    return (await request.json()) as CheckoutPayload;
  }

  const formData = await request.formData();
  return {
    email: String(formData.get("email") || ""),
    name: String(formData.get("name") || ""),
    plan: String(formData.get("plan") || ""),
    userId: String(formData.get("userId") || "")
  };
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    const plan = payload.plan === "pro" ? "pro" : payload.plan === "starter" ? "starter" : null;

    if (!plan) {
      return NextResponse.json({ error: "Choose Starter or Pro to continue." }, { status: 400 });
    }

    const stripeEnv = getStripeEnv();
    const stripe = getStripeClient();
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const userId = user?.id || payload.userId || null;
    const email = user?.email || payload.email;
    const name = payload.name || user?.user_metadata?.full_name || "";

    if (!email) {
      return NextResponse.json({ error: "An email address is required for checkout." }, { status: 400 });
    }

    const priceId = plan === "starter" ? stripeEnv.STRIPE_STARTER_PRICE_ID : stripeEnv.STRIPE_PRO_PRICE_ID;
    const siteUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      metadata: {
        plan,
        user_id: userId || "",
        email,
        product: BRAND_SLUG
      },
      subscription_data: {
        metadata: {
          plan,
          user_id: userId || "",
          email
        }
      },
      success_url: `${siteUrl}/signin?billing=success&next=/dashboard`,
      cancel_url: `${siteUrl}/signup?plan=${plan}&billing=cancelled`
    });

    if (isJsonRequest(request.headers.get("content-type"))) {
      return NextResponse.json({
        plan: (PLANS[plan as PlanId] || PLANS.starter).name,
        url: session.url
      });
    }

    return NextResponse.redirect(session.url || `${siteUrl}/dashboard`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
