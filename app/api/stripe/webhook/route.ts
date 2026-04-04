import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripeEnv } from "@/lib/env";
import { planFromPriceId } from "@/lib/plans";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function resolveProfileId(admin: ReturnType<typeof createSupabaseAdminClient>, metadata: Record<string, string | undefined>) {
  if (metadata.user_id) {
    return metadata.user_id;
  }

  if (!metadata.email) {
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", metadata.email)
    .maybeSingle<{ id: string }>();

  return profile?.id ?? null;
}

async function upsertSubscriptionFromEvent(eventObject: Stripe.Subscription | Stripe.Checkout.Session) {
  const admin = createSupabaseAdminClient();
  const stripe = getStripeClient();

  if (eventObject.object === "checkout.session") {
    const subscriptionId =
      typeof eventObject.subscription === "string" ? eventObject.subscription : eventObject.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertSubscriptionFromEvent(subscription);
    return;
  }

  const priceId = eventObject.items.data[0]?.price.id || null;
  const plan = planFromPriceId(priceId) || (eventObject.metadata.plan as "starter" | "pro" | null);
  const profileId = await resolveProfileId(admin, eventObject.metadata || {});

  if (!profileId || !plan) {
    return;
  }

  const currentPeriodEnd = (eventObject as Stripe.Subscription & { current_period_end?: number }).current_period_end;

  await admin.from("subscriptions").upsert(
    {
      profile_id: profileId,
      stripe_customer_id: typeof eventObject.customer === "string" ? eventObject.customer : eventObject.customer?.id,
      stripe_subscription_id: eventObject.id,
      plan,
      status: eventObject.status,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      cancel_at_period_end: eventObject.cancel_at_period_end
    } as never,
    {
      onConflict: "profile_id"
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new NextResponse("Missing stripe signature", { status: 400 });
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(body, signature, getStripeEnv().STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      await upsertSubscriptionFromEvent(event.data.object as Stripe.Checkout.Session);
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      await upsertSubscriptionFromEvent(event.data.object as Stripe.Subscription);
    }

    if (event.type === "customer.subscription.deleted") {
      const admin = createSupabaseAdminClient();
      const subscription = event.data.object as Stripe.Subscription;
      await admin
        .from("subscriptions")
        .update({
          status: "canceled",
          cancel_at_period_end: true
        } as never)
        .eq("stripe_subscription_id", subscription.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed.";
    return new NextResponse(message, { status: 400 });
  }
}
