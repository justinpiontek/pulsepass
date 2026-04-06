import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripeEnv } from "@/lib/env";
import { planFromPriceId } from "@/lib/plans";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ProfileLookupOptions = {
  clientReferenceId?: string | null;
  customerId?: string | null;
  email?: string | null;
  metadata?: Record<string, string | undefined>;
  subscriptionId?: string | null;
};

async function findProfileIdByEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email?: string | null) {
  if (!email) {
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle<{ id: string }>();

  return profile?.id ?? null;
}

async function resolveProfileId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  { clientReferenceId, customerId, email, metadata = {}, subscriptionId }: ProfileLookupOptions
) {
  if (metadata.user_id) {
    return metadata.user_id;
  }

  if (clientReferenceId) {
    return clientReferenceId;
  }

  const emailMatch = await findProfileIdByEmail(admin, metadata.email || email);

  if (emailMatch) {
    return emailMatch;
  }

  if (subscriptionId) {
    const { data: existingSubscription } = await admin
      .from("subscriptions")
      .select("profile_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle<{ profile_id: string }>();

    if (existingSubscription?.profile_id) {
      return existingSubscription.profile_id;
    }
  }

  if (!customerId) {
    return null;
  }

  const { data: existingSubscription } = await admin
    .from("subscriptions")
    .select("profile_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ profile_id: string }>();

  return existingSubscription?.profile_id ?? null;
}

async function upsertSubscriptionRecord(
  subscription: Stripe.Subscription,
  context: {
    email?: string | null;
    plan?: "starter" | "pro" | null;
    profileId?: string | null;
  } = {}
) {
  const admin = createSupabaseAdminClient();
  const priceId = subscription.items.data[0]?.price.id || null;
  const plan = context.plan || planFromPriceId(priceId) || (subscription.metadata.plan as "starter" | "pro" | null);
  const profileId =
    context.profileId ||
    (await resolveProfileId(admin, {
      customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      email: context.email,
      metadata: subscription.metadata || {},
      subscriptionId: subscription.id
    }));

  if (!profileId || !plan) {
    return;
  }

  const currentPeriodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;

  await admin.from("subscriptions").upsert(
    {
      profile_id: profileId,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end
    } as never,
    {
      onConflict: "profile_id"
    }
  );
}

async function upsertSubscriptionFromEvent(eventObject: Stripe.Subscription | Stripe.Checkout.Session) {
  const stripe = getStripeClient();

  if (eventObject.object === "checkout.session") {
    const subscriptionId =
      typeof eventObject.subscription === "string" ? eventObject.subscription : eventObject.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const admin = createSupabaseAdminClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const profileId = await resolveProfileId(admin, {
      clientReferenceId: eventObject.client_reference_id,
      customerId: typeof eventObject.customer === "string" ? eventObject.customer : eventObject.customer?.id,
      email: eventObject.customer_details?.email || eventObject.customer_email,
      metadata: eventObject.metadata || {},
      subscriptionId
    });

    await upsertSubscriptionRecord(subscription, {
      email: eventObject.customer_details?.email || eventObject.customer_email,
      profileId
    });
    return;
  }

  await upsertSubscriptionRecord(eventObject);
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
