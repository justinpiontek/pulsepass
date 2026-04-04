export type PlanId = "starter" | "pro" | "enterprise";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceHeadline: string;
  priceLabel: string;
  priceSuffix?: string;
  description: string;
  selfServe: boolean;
  supportsEvents: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceHeadline: "$8",
    priceLabel: "$8/mo",
    priceSuffix: "per month",
    description: "One hosted contact page with one QR that stays live.",
    selfServe: true,
    supportsEvents: false,
    features: [
      "Hosted contact page",
      "One live QR destination",
      "Save-contact download",
      "Update anytime"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceHeadline: "$15",
    priceLabel: "$15/mo",
    priceSuffix: "per month",
    description: "Your contact page plus a linked event page behind the same main QR.",
    selfServe: true,
    supportsEvents: true,
    features: [
      "Everything in Starter",
      "Event page and RSVP",
      "Add-to-calendar download",
      "Wallet URL fields"
    ]
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceHeadline: "Custom",
    priceLabel: "Custom",
    priceSuffix: "quoted by rollout",
    description: "Admin-led rollout with pricing based on seats, setup, and support needs.",
    selfServe: false,
    supportsEvents: true,
    features: [
      "Bulk rollout",
      "Department templates",
      "Central billing",
      "Sales-assisted onboarding"
    ]
  }
};

export function getPlan(planId?: string | null): PlanDefinition {
  if (planId === "pro" || planId === "enterprise") {
    return PLANS[planId];
  }

  return PLANS.starter;
}

export function allowsEvents(planId?: string | null) {
  return planId === "pro" || planId === "enterprise";
}

export function hasActiveAccess(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function planFromPriceId(priceId?: string | null): PlanId | null {
  if (!priceId) {
    return null;
  }

  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
    return "starter";
  }

  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    return "pro";
  }

  return null;
}
