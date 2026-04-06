"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { allowsEvents, getCardLimit, hasActiveAccess } from "@/lib/plans";
import { PROFILE_PHOTO_BUCKET } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeExternalUrl, slugify } from "@/lib/utils";

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

function dashboardCardHref(cardId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({
    card: cardId
  });

  Object.entries(extra || {}).forEach(([key, value]) => {
    params.set(key, value);
  });

  return `/dashboard?${params.toString()}`;
}

function fileExtensionFromName(name: string, type?: string) {
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  const cleanFromName = (fromName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (cleanFromName) {
    return cleanFromName;
  }

  const mime = (type || "").toLowerCase();

  if (mime === "image/jpeg") {
    return "jpg";
  }

  if (mime === "image/png") {
    return "png";
  }

  if (mime === "image/webp") {
    return "webp";
  }

  if (mime === "image/heic") {
    return "heic";
  }

  if (mime === "image/heif") {
    return "heif";
  }

  return "jpg";
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

async function resolveUniqueCardSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  baseValue: string,
  existingCardId?: string | null
) {
  const baseSlug = slugify(baseValue || "card") || "card";
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const { data: existing } = await supabase.from("cards").select("id").eq("slug", candidate).maybeSingle<{ id: string }>();

    if (!existing || existing.id === existingCardId) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function resolveUniqueEventSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  cardId: string,
  baseValue: string,
  existingEventId?: string | null
) {
  const baseSlug = slugify(baseValue || "event") || "event";
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("card_id", cardId)
      .eq("slug", candidate)
      .maybeSingle<{ id: string }>();

    if (!existing || existing.id === existingEventId) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export async function createCardAction() {
  const { supabase, user } = await requireUser();
  const subscription = await getSubscriptionState(user.id);

  if (!hasActiveAccess(subscription?.status)) {
    redirect("/dashboard?error=billing");
  }

  const cardLimit = getCardLimit(subscription?.plan);
  const [{ count }, { data: account }] = await Promise.all([
    supabase.from("cards").select("*", { count: "exact", head: true }).eq("account_id", user.id),
    supabase.from("profiles").select("full_name,company_name,email").eq("id", user.id).maybeSingle<{
      full_name: string | null;
      company_name: string | null;
      email: string;
    }>()
  ]);

  if ((count || 0) >= cardLimit) {
    redirect("/dashboard?error=card-limit");
  }

  const cardNumber = (count || 0) + 1;
  const fallbackName = cardNumber === 1 ? "Main card" : `Card ${cardNumber}`;
  const fullName = account?.full_name || null;
  const companyName = account?.company_name || null;
  const slug = await resolveUniqueCardSlug(
    supabase,
    `${companyName || fullName || user.email?.split("@")[0] || "card"}-${cardNumber}`
  );

  const { data: inserted, error } = await supabase
    .from("cards")
    .insert({
      account_id: user.id,
      email: user.email || account?.email || "",
      full_name: fullName,
      company_name: companyName,
      contact_headline: fallbackName,
      slug,
      is_primary: cardNumber === 1
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    redirect(`/dashboard?error=${encodeURIComponent(error?.message || "We could not create a new card.")}`);
  }

  revalidatePath("/dashboard");
  redirect(dashboardCardHref(inserted.id, { created: "card" }));
}

export async function saveCardAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const admin = createSupabaseAdminClient();
  const cardId = textValue(formData, "card_id");

  if (!cardId) {
    redirect("/dashboard?error=Choose%20a%20card%20before%20saving.");
  }

  const { data: existingCard } = await supabase
    .from("cards")
    .select("id,slug,profile_photo_path")
    .eq("id", cardId)
    .eq("account_id", user.id)
    .maybeSingle<{ id: string; slug: string; profile_photo_path: string | null }>();

  if (!existingCard) {
    redirect("/dashboard?error=That%20card%20could%20not%20be%20found.");
  }

  const fullName = textValue(formData, "full_name");
  const companyName = textValue(formData, "company_name");
  const rawSlug = textValue(formData, "slug");
  const slug = await resolveUniqueCardSlug(
    supabase,
    rawSlug || companyName || fullName || user.email || user.id.slice(0, 8),
    cardId
  );
  const existingPhotoPath = nullableValue(formData, "existing_profile_photo_path");
  const photoInput = formData.get("profile_photo");
  let profilePhotoPath = existingPhotoPath;

  if (photoInput instanceof File && photoInput.size > 0) {
    if (!photoInput.type.startsWith("image/")) {
      redirect(dashboardCardHref(cardId, { error: "Upload%20a%20PNG,%20JPG,%20WebP,%20or%20HEIC%20image." }));
    }

    if (photoInput.size > 5 * 1024 * 1024) {
      redirect(dashboardCardHref(cardId, { error: "Profile%20photo%20must%20be%205MB%20or%20smaller." }));
    }

    const extension = fileExtensionFromName(photoInput.name, photoInput.type);
    const fileName = slugify(photoInput.name.replace(/\.[^.]+$/, "") || fullName || companyName || "profile-photo");
    const nextPhotoPath = `${user.id}/${cardId}/${Date.now()}-${fileName}.${extension}`;

    const { error: uploadError } = await admin.storage.from(PROFILE_PHOTO_BUCKET).upload(nextPhotoPath, photoInput, {
      cacheControl: "3600",
      contentType: photoInput.type,
      upsert: false
    });

    if (uploadError) {
      redirect(dashboardCardHref(cardId, { error: uploadError.message }));
    }

    if (existingPhotoPath && existingPhotoPath !== nextPhotoPath) {
      await admin.storage.from(PROFILE_PHOTO_BUCKET).remove([existingPhotoPath]);
    }

    profilePhotoPath = nextPhotoPath;
  }

  const payload = {
    email: textValue(formData, "email") || user.email || "",
    full_name: fullName || null,
    company_name: companyName || null,
    job_title: nullableValue(formData, "job_title"),
    phone: nullableValue(formData, "phone"),
    website: normalizeExternalUrl(nullableValue(formData, "website")),
    bio: nullableValue(formData, "bio"),
    linkedin_url: normalizeExternalUrl(nullableValue(formData, "linkedin_url")),
    instagram_url: normalizeExternalUrl(nullableValue(formData, "instagram_url")),
    facebook_url: normalizeExternalUrl(nullableValue(formData, "facebook_url")),
    x_url: normalizeExternalUrl(nullableValue(formData, "x_url")),
    profile_photo_path: profilePhotoPath,
    slug,
    contact_headline: nullableValue(formData, "contact_headline"),
    wallet_apple_url: normalizeExternalUrl(nullableValue(formData, "wallet_apple_url")),
    wallet_google_url: normalizeExternalUrl(nullableValue(formData, "wallet_google_url"))
  };

  const { error } = await supabase.from("cards").update(payload).eq("id", cardId).eq("account_id", user.id);

  if (error) {
    redirect(dashboardCardHref(cardId, { error: error.message }));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/${existingCard.slug}`);
  revalidatePath(`/${slug}`);
  redirect(dashboardCardHref(cardId, { saved: "contact" }));
}

export async function saveEventAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const subscription = await getSubscriptionState(user.id);

  if (!allowsEvents(subscription?.plan) || !hasActiveAccess(subscription?.status)) {
    redirect("/dashboard?error=upgrade");
  }

  const cardId = textValue(formData, "card_id");
  const eventId = textValue(formData, "event_id");

  if (!cardId) {
    redirect("/dashboard?error=Choose%20a%20card%20before%20saving%20an%20event.");
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("account_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!card) {
    redirect("/dashboard?error=That%20card%20could%20not%20be%20found.");
  }

  const title = textValue(formData, "title");
  const rawSlug = textValue(formData, "slug");
  const eventSlug = await resolveUniqueEventSlug(supabase, cardId, rawSlug || title || "event", eventId || null);
  const payload = {
    owner_id: user.id,
    card_id: cardId,
    slug: eventSlug,
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
    redirect(dashboardCardHref(cardId, { error: error.message }));
  }

  revalidatePath("/dashboard");
  redirect(dashboardCardHref(cardId, { saved: "event" }));
}

export async function toggleCardPublishAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const subscription = await getSubscriptionState(user.id);

  if (!hasActiveAccess(subscription?.status)) {
    redirect("/dashboard?error=billing");
  }

  const cardId = textValue(formData, "card_id");
  const nextValue = textValue(formData, "next") === "true";

  if (!cardId) {
    redirect("/dashboard?error=Choose%20a%20card%20before%20publishing.");
  }

  const { data: card } = await supabase
    .from("cards")
    .select("slug")
    .eq("id", cardId)
    .eq("account_id", user.id)
    .maybeSingle<{ slug: string }>();

  if (!card) {
    redirect("/dashboard?error=That%20card%20could%20not%20be%20found.");
  }

  const { error } = await supabase
    .from("cards")
    .update({
      contact_published: nextValue
    })
    .eq("id", cardId)
    .eq("account_id", user.id);

  if (error) {
    redirect(dashboardCardHref(cardId, { error: error.message }));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/${card.slug}`);
  redirect(dashboardCardHref(cardId, { published: nextValue ? "contact" : "draft" }));
}

export async function toggleEventPublishAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const subscription = await getSubscriptionState(user.id);

  if (!allowsEvents(subscription?.plan) || !hasActiveAccess(subscription?.status)) {
    redirect("/dashboard?error=upgrade");
  }

  const cardId = textValue(formData, "card_id");
  const eventId = textValue(formData, "event_id");
  const nextValue = textValue(formData, "next") === "true";

  if (!eventId) {
    redirect(dashboardCardHref(cardId, { error: "Save%20the%20event%20details%20before%20publishing." }));
  }

  const { error } = await supabase
    .from("events")
    .update({
      published: nextValue
    })
    .eq("id", eventId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(dashboardCardHref(cardId, { error: error.message }));
  }

  revalidatePath("/dashboard");
  redirect(dashboardCardHref(cardId, { published: nextValue ? "event" : "event-draft" }));
}
