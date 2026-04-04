"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { allowsEvents, hasActiveAccess } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function nullableValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin?next=/dashboard");
  }

  return { supabase, user };
}

async function getSubscriptionState(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("profile_id", userId)
    .maybeSingle<{ plan: string; status: string }>();

  return subscription ?? null;
}

export async function saveProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const fullName = textValue(formData, "full_name");
  const companyName = textValue(formData, "company_name");
  const rawSlug = textValue(formData, "slug");
  const slug = slugify(rawSlug || companyName || fullName || user.email || user.id.slice(0, 8));

  const payload = {
    id: user.id,
    email: user.email || textValue(formData, "email"),
    full_name: fullName || null,
    company_name: companyName || null,
    job_title: nullableValue(formData, "job_title"),
    phone: nullableValue(formData, "phone"),
    website: nullableValue(formData, "website"),
    bio: nullableValue(formData, "bio"),
    slug,
    contact_headline: nullableValue(formData, "contact_headline"),
    wallet_apple_url: nullableValue(formData, "wallet_apple_url"),
    wallet_google_url: nullableValue(formData, "wallet_google_url")
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id"
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/${slug}`);
  redirect("/dashboard?saved=contact");
}

export async function saveEventAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const subscription = await getSubscriptionState(user.id);

  if (!allowsEvents(subscription?.plan) || !hasActiveAccess(subscription?.status)) {
    redirect("/dashboard?error=upgrade");
  }

  const title = textValue(formData, "title");
  const rawSlug = textValue(formData, "slug");
  const eventId = textValue(formData, "event_id");
  const payload = {
    owner_id: user.id,
    slug: slugify(rawSlug || title || "event"),
    title: title || "Untitled event",
    summary: nullableValue(formData, "summary"),
    location: nullableValue(formData, "location"),
    starts_at: nullableValue(formData, "starts_at"),
    ends_at: nullableValue(formData, "ends_at"),
    timezone: nullableValue(formData, "timezone") || "America/Chicago",
    rsvp_enabled: formData.get("rsvp_enabled") === "on",
    capacity: textValue(formData, "capacity") ? Number(textValue(formData, "capacity")) : null
  };

  const query = eventId
    ? supabase.from("events").update(payload).eq("id", eventId).eq("owner_id", user.id)
    : supabase.from("events").insert(payload);

  const { error } = await query;

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?saved=event");
}

export async function toggleContactPublishAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const subscription = await getSubscriptionState(user.id);

  if (!hasActiveAccess(subscription?.status)) {
    redirect("/dashboard?error=billing");
  }

  const nextValue = textValue(formData, "next") === "true";
  const slug = slugify(textValue(formData, "slug") || user.id.slice(0, 8));

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      slug,
      contact_published: nextValue
    },
    {
      onConflict: "id"
    }
  );

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/${slug}`);
  redirect(`/dashboard?published=${nextValue ? "contact" : "draft"}`);
}

export async function toggleEventPublishAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const subscription = await getSubscriptionState(user.id);

  if (!allowsEvents(subscription?.plan) || !hasActiveAccess(subscription?.status)) {
    redirect("/dashboard?error=upgrade");
  }

  const eventId = textValue(formData, "event_id");
  const nextValue = textValue(formData, "next") === "true";

  if (!eventId) {
    redirect("/dashboard?error=save-event-first");
  }

  const { error } = await supabase
    .from("events")
    .update({
      published: nextValue
    })
    .eq("id", eventId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?published=${nextValue ? "event" : "event-draft"}`);
}
