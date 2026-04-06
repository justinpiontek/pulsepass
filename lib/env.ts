import { z } from "zod";

import { BRAND_SUPPORT_EMAIL } from "@/lib/brand";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
});

const serviceEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

const stripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_STARTER_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1)
});

const googleWalletEnvSchema = z.object({
  GOOGLE_WALLET_ISSUER_ID: z.string().min(1),
  GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1),
  GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY_ID: z.string().min(1).optional(),
  GOOGLE_WALLET_CLASS_SUFFIX: z.string().min(1).optional()
});

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || BRAND_SUPPORT_EMAIL;
}

export function hasSupabasePublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabasePublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}

export function getSupabaseServiceRoleKey() {
  return serviceEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  }).SUPABASE_SERVICE_ROLE_KEY;
}

export function getStripeEnv() {
  return stripeEnvSchema.parse({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID,
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID
  });
}

export function hasGoogleWalletEnv() {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

export function getGoogleWalletEnv() {
  const env = googleWalletEnvSchema.parse({
    GOOGLE_WALLET_ISSUER_ID: process.env.GOOGLE_WALLET_ISSUER_ID,
    GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY_ID: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    GOOGLE_WALLET_CLASS_SUFFIX: process.env.GOOGLE_WALLET_CLASS_SUFFIX
  });

  return {
    ...env,
    GOOGLE_WALLET_CLASS_SUFFIX: env.GOOGLE_WALLET_CLASS_SUFFIX || "linxpass-contact",
    GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY: env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
  };
}
