import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRecord = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  website: string | null;
  bio: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
  profile_photo_path: string | null;
  slug: string;
  contact_published: boolean;
  contact_headline: string | null;
  wallet_apple_url: string | null;
  wallet_google_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CardRecord = {
  id: string;
  account_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  website: string | null;
  bio: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
  profile_photo_path: string | null;
  slug: string;
  contact_published: boolean;
  contact_headline: string | null;
  wallet_apple_url: string | null;
  wallet_google_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRecord = {
  id: string;
  owner_id: string;
  card_id: string;
  slug: string;
  title: string;
  summary: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  rsvp_enabled: boolean;
  capacity: number | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRecord = {
  id: string;
  profile_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

export async function getDashboardData(userId: string, selectedCardId?: string | null) {
  const supabase = await createSupabaseServerClient();

  const [{ data: account }, { data: cards }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle<ProfileRecord>(),
    supabase
      .from("cards")
      .select("*")
      .eq("account_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("subscriptions").select("*").eq("profile_id", userId).maybeSingle<SubscriptionRecord>()
  ]);

  const resolvedCards = (cards as CardRecord[] | null) || [];
  const selectedCard =
    resolvedCards.find((card) => card.id === selectedCardId) ||
    resolvedCards[0] ||
    null;

  const { data: events } = selectedCard
    ? await supabase
        .from("events")
        .select("*")
        .eq("card_id", selectedCard.id)
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: null };

  return {
    account: account ?? null,
    cards: resolvedCards,
    selectedCard,
    event: ((events as EventRecord[] | null) || [])[0] ?? null,
    subscription: subscription ?? null
  };
}

export async function getPublicProfileBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("cards")
    .select("*")
    .eq("slug", slug)
    .eq("contact_published", true)
    .maybeSingle<CardRecord>();

  if (!profile) {
    return null;
  }

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("card_id", profile.id)
    .eq("published", true)
    .order("starts_at", { ascending: true })
    .limit(1);

  return {
    profile,
    featuredEvent: ((events as EventRecord[] | null) || [])[0] ?? null
  };
}

export async function getPublishedEventBySlugs(slug: string, eventSlug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("cards")
    .select("*")
    .eq("slug", slug)
    .eq("contact_published", true)
    .maybeSingle<CardRecord>();

  if (!profile) {
    return null;
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("card_id", profile.id)
    .eq("slug", eventSlug)
    .eq("published", true)
    .maybeSingle<EventRecord>();

  if (!event) {
    return null;
  }

  return {
    profile,
    event
  };
}

export async function countEventRsvps(eventId: string) {
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  return count ?? 0;
}
