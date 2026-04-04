import { redirect, notFound } from "next/navigation";

import { countEventRsvps, getPublishedEventBySlugs } from "@/lib/data";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateRange, toCalendarFile } from "@/lib/utils";

type EventPageProps = {
  params: Promise<{
    eventSlug: string;
    slug: string;
  }>;
  searchParams: Promise<{
    rsvp?: string;
  }>;
};

export default async function EventPage({ params, searchParams }: EventPageProps) {
  if (!hasSupabasePublicEnv()) {
    notFound();
  }

  const { slug, eventSlug } = await params;
  const query = await searchParams;
  const data = await getPublishedEventBySlugs(slug, eventSlug);

  if (!data) {
    notFound();
  }

  const { profile, event } = data;
  const rsvpTotal = await countEventRsvps(event.id);
  const remaining = typeof event.capacity === "number" ? Math.max(event.capacity - rsvpTotal, 0) : null;
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    toCalendarFile(event, profile.full_name || profile.company_name)
  )}`;

  async function rsvpAction(formData: FormData) {
    "use server";

    const admin = createSupabaseAdminClient();
    const resolved = await getPublishedEventBySlugs(slug, eventSlug);

    if (!resolved) {
      redirect(`/${slug}/events/${eventSlug}?rsvp=missing`);
    }

    const guestName = String(formData.get("guestName") || "").trim();
    const guestEmail = String(formData.get("guestEmail") || "").trim();
    const guestCount = Math.max(Number(formData.get("guestCount") || 1), 1);

    if (!guestName || !guestEmail) {
      redirect(`/${slug}/events/${eventSlug}?rsvp=invalid`);
    }

    const currentCount = await countEventRsvps(resolved.event.id);
    if (typeof resolved.event.capacity === "number" && currentCount + guestCount > resolved.event.capacity) {
      redirect(`/${slug}/events/${eventSlug}?rsvp=full`);
    }

    const { error } = await admin.from("rsvps").upsert(
      {
        event_id: resolved.event.id,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_count: guestCount,
        status: "going"
      } as never,
      {
        onConflict: "event_id,guest_email"
      }
    );

    if (error) {
      redirect(`/${slug}/events/${eventSlug}?rsvp=error`);
    }

    redirect(`/${slug}/events/${eventSlug}?rsvp=success`);
  }

  return (
    <main className="public-shell">
      <section className="public-card">
        <div className="section-eyebrow">PulsePass event page</div>
        <h1>{event.title}</h1>
        <p className="lead">{formatDateRange(event.starts_at, event.ends_at, event.timezone || undefined)}</p>
        {event.location ? <p className="public-copy">{event.location}</p> : null}
        {event.summary ? <p className="public-copy">{event.summary}</p> : null}

        <div className="public-actions">
          <a download={`${event.slug}.ics`} href={icsHref}>
            Add to calendar
          </a>
          <a href={`/${profile.slug}`}>Back to contact page</a>
          <a href={`mailto:${profile.email}`}>Email host</a>
        </div>

        <div className="stat-row" style={{ marginTop: 24 }}>
          <div className="stat">
            <strong>{rsvpTotal}</strong>
            <span>RSVPs</span>
          </div>
          {typeof remaining === "number" ? (
            <div className="stat">
              <strong>{remaining}</strong>
              <span>Spots left</span>
            </div>
          ) : null}
        </div>
      </section>

      {event.rsvp_enabled ? (
        <section className="public-card">
          <div className="section-eyebrow">RSVP</div>
          <h2>Save your spot</h2>
          {query.rsvp === "success" ? <p className="status-message">Your RSVP is in.</p> : null}
          {query.rsvp === "full" ? <p className="status-message error">This event is currently full.</p> : null}
          {query.rsvp === "error" ? <p className="status-message error">We could not save your RSVP.</p> : null}
          {query.rsvp === "invalid" ? <p className="status-message error">Enter your name and email to RSVP.</p> : null}
          <form action={rsvpAction} className="stack-form">
            <label>
              Name
              <input name="guestName" required type="text" />
            </label>
            <label>
              Email
              <input name="guestEmail" required type="email" />
            </label>
            <label>
              Guests
              <input defaultValue={1} min={1} name="guestCount" type="number" />
            </label>
            <button className="primary-button full-width" type="submit">
              RSVP
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
