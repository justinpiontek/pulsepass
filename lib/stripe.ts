import Stripe from "stripe";

import { BRAND_NAME } from "@/lib/brand";
import { getStripeEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeEnv().STRIPE_SECRET_KEY, {
      appInfo: {
        name: BRAND_NAME
      }
    });
  }

  return stripeClient;
}
