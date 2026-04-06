import Link from "next/link";
import { redirect } from "next/navigation";

import {
  saveEventAction,
  saveProfileAction,
  toggleContactPublishAction,
  toggleEventPublishAction
} from "@/app/(app)/dashboard/actions";
import { BRAND_NAME } from "@/lib/brand";
import { getDashboardData } from "@/lib/data";
import { hasGoogleWalletEnv, hasSupabasePublicEnv } from "@/lib/env";
import { getPlan, hasActiveAccess, allowsEvents } from "@/lib/plans";
import { buildQrCodePath } from "@/lib/qr";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl, formatDateRange } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<{
    billing?: string;
    error?: string;
    published?: string;
    saved?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const query = await searchParams;

  if (!hasSupabasePublicEnv()) {
    return (
      <main className="dashboard-shell">
        <div className="app-nav">
          <Link className="brand" href="/">
            {BRAND_NAME}
          </Link>
        </div>
        <section className="panel panel--wide" style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="section-eyebrow">Setup needed</div>
          <h1 className="page-title">Connect Supabase and Stripe to use the dashboard.</h1>
          <p className="lead">
            You can preview the marketing pages now. To use real signup, billing, and publishing, copy
            `.env.example` to `.env`, add your keys, and run the SQL migration in Supabase.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const params = new URLSearchParams({
      next: "/dashboard"
    });

    if (query.billing === "success") {
      params.set("billing", "success");
    }

    redirect(`/signin?${params.toString()}`);
  }

  const { profile, event, subscription } = await getDashboardData(user.id);
  const plan = getPlan(subscription?.plan || "starter");
  const accessIsActive = hasActiveAccess(subscription?.status);
  const googleWalletIsReady = hasGoogleWalletEnv();

  if (!accessIsActive) {
    const params = new URLSearchParams({
      billing: "required"
    });

    if (user.email) {
      params.set("email", user.email);
    }

    redirect(`/auth/signout?next=${encodeURIComponent(`/signin?${params.toString()}`)}`);
  }

  const eventsEnabled = allowsEvents(subscription?.plan) && accessIsActive;
  const profileSlug = profile?.slug || (user.email?.split("@")[0] ?? user.id.slice(0, 8));
  const contactUrl = profile?.contact_published ? absoluteUrl(`/${profileSlug}`) : null;
  const eventUrl =
    profile?.contact_published && event?.published ? absoluteUrl(`/${profileSlug}/events/${event.slug}`) : null;
  const qrPreviewUrl = contactUrl
    ? buildQrCodePath({
        data: contactUrl,
        filename: `${profileSlug}-contact-qr`,
        format: "svg",
        size: 360
      })
    : null;
  const qrDownloadPngUrl = contactUrl
    ? buildQrCodePath({
        data: contactUrl,
        download: true,
        filename: `${profileSlug}-contact-qr`,
        format: "png",
        size: 1200
      })
    : null;
  const qrDownloadSvgUrl = contactUrl
    ? buildQrCodePath({
        data: contactUrl,
        download: true,
        filename: `${profileSlug}-contact-qr`,
        format: "svg",
        size: 1200
      })
    : null;
  const currentPlanId = subscription?.plan === "pro" || subscription?.plan === "enterprise" ? subscription.plan : "starter";
  const googleWalletPreviewUrl = contactUrl && googleWalletIsReady ? absoluteUrl(`/api/wallet/google/${profileSlug}`) : null;

  async function signOutAction() {
    "use server";

    const authClient = await createSupabaseServerClient();
    await authClient.auth.signOut();
    redirect("/");
  }

  return (
    <main className="dashboard-shell">
      <div className="app-nav">
        <Link className="brand" href="/">
          {BRAND_NAME}
        </Link>
        <div className="app-nav__actions">
          {contactUrl ? (
            <Link className="ghost-button" href={contactUrl}>
              View live page
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button className="ghost-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel panel--wide">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">Dashboard</div>
              <h1 className="page-title">Keep your page live and your QR consistent.</h1>
              <p className="lead">
                Your contact page is the main destination. If you are on Pro, your event page can live behind
                that same scan flow.
              </p>
            </div>
            <span className="badge">
              {plan.name} {accessIsActive ? "active" : "setup"}
            </span>
          </div>

          {query.saved ? <p className="status-message">Saved. Your dashboard is up to date.</p> : null}
          {query.published ? <p className="status-message">Publishing status updated.</p> : null}
          {query.error ? (
            <p className="status-message error">
              {query.error === "upgrade"
                ? "This action needs an active Pro subscription."
                : query.error === "billing"
                  ? "Finish billing before publishing your page."
                  : query.error === "save-event-first"
                    ? "Save the event details before publishing the event page."
                    : query.error}
            </p>
          ) : null}
          {!accessIsActive ? (
            <div className="notice">
              <p className="micro-copy">
                Finish checkout to unlock publishing and keep your QR live. If you want events and RSVP,
                start Pro instead of Starter.
              </p>
              <div className="button-row" style={{ marginTop: 14 }}>
                <form action="/api/checkout/session" method="post">
                  <input name="plan" type="hidden" value="starter" />
                  <button className="ghost-button" type="submit">
                    Start Starter checkout
                  </button>
                </form>
                <form action="/api/checkout/session" method="post">
                  <input name="plan" type="hidden" value="pro" />
                  <button className="primary-button" type="submit">
                    Start Pro checkout
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          <div className="stat-row">
            <div className="stat">
              <strong>{plan.name}</strong>
              <span>{plan.priceLabel}</span>
            </div>
            <div className="stat">
              <strong>{accessIsActive ? "Billing active" : "Checkout needed"}</strong>
              <span>{subscription?.status || "No active subscription yet"}</span>
            </div>
            <div className="stat">
              <strong>{contactUrl ? "QR live" : "QR pending"}</strong>
              <span>{contactUrl ? "Your main QR can point at the live contact page now." : "Publish the contact page to go live."}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">Contact page</div>
              <h2>Your main QR destination</h2>
            </div>
            <span className="badge">{profile?.contact_published ? "Published" : "Draft"}</span>
          </div>

          <form action={saveProfileAction} className="stack-form">
            <label>
              Full name
              <input defaultValue={profile?.full_name || ""} name="full_name" type="text" />
            </label>
            <label>
              Company name
              <input defaultValue={profile?.company_name || ""} name="company_name" type="text" />
            </label>
            <label>
              Job title
              <input defaultValue={profile?.job_title || ""} name="job_title" type="text" />
            </label>
            <label>
              Phone
              <input defaultValue={profile?.phone || ""} name="phone" type="tel" />
            </label>
            <label>
              Website
              <input defaultValue={profile?.website || ""} name="website" type="url" />
            </label>
            <label>
              Public slug
              <input defaultValue={profileSlug} name="slug" type="text" />
            </label>
            <label>
              Headline
              <input defaultValue={profile?.contact_headline || ""} name="contact_headline" type="text" />
            </label>
            <label>
              Short bio
              <textarea defaultValue={profile?.bio || ""} name="bio" />
            </label>
            <label>
              Apple Wallet QR pass URL
              <input defaultValue={profile?.wallet_apple_url || ""} name="wallet_apple_url" type="url" />
            </label>
            <label>
              Google Wallet QR pass override URL
              <input defaultValue={profile?.wallet_google_url || ""} name="wallet_google_url" type="url" />
            </label>
            <p className="micro-copy">
              These wallet passes are for you to carry your QR at events. People scan your QR, then land on
              your contact page and tap Save contact.
            </p>
            <div className="dashboard-links">
              <div className="link-tile">
                <strong>Google Wallet status</strong>
                <span className="micro-copy">
                  {googleWalletIsReady
                    ? "Your Android QR pass can be added from the dashboard once your contact page is live."
                    : "Add Google Wallet issuer credentials in your environment to turn on your Android QR pass."}
                </span>
                {googleWalletPreviewUrl ? <code>{googleWalletPreviewUrl}</code> : null}
              </div>
              <div className="link-tile">
                <strong>Apple Wallet status</strong>
                <span className="micro-copy">
                  {profile?.wallet_apple_url
                    ? "Your Apple Wallet QR pass URL is connected."
                    : "Apple Wallet still needs a signed .pkpass link before you can carry this QR in Wallet on iPhone."}
                </span>
              </div>
            </div>
            <button className="primary-button full-width" type="submit">
              Save contact page
            </button>
          </form>

          <form action={toggleContactPublishAction} className="button-row">
            <input name="slug" type="hidden" value={profileSlug} />
            <input name="next" type="hidden" value={profile?.contact_published ? "false" : "true"} />
            <button className="ghost-button" type="submit">
              {profile?.contact_published ? "Unpublish contact page" : "Publish contact page"}
            </button>
          </form>

          <div className="dashboard-links">
            <div className="link-tile">
              <strong>Contact page URL</strong>
              <span className="micro-copy">
                {contactUrl ? "This is the live route behind your main QR." : "Publish the page to create the live route."}
              </span>
              {contactUrl ? <code>{contactUrl}</code> : null}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">Main QR</div>
              <h2>Carry this QR anywhere</h2>
            </div>
          </div>

          <div className="qr-card">
            {qrPreviewUrl ? (
              <img alt="Live QR code" src={qrPreviewUrl} />
            ) : (
              <p className="micro-copy">Publish your contact page to generate the live QR destination.</p>
            )}
            <p className="micro-copy">
              Use this on printed cards if you want, or keep it on your phone. At events, open your wallet pass
              or this screen and let people scan. They land on your contact page and can save your info right away.
            </p>
            {contactUrl ? (
              <div className="button-row qr-actions">
                <a className="ghost-button" download href={qrDownloadPngUrl || undefined}>
                  Download PNG
                </a>
                <a className="ghost-button" download href={qrDownloadSvgUrl || undefined}>
                  Download SVG
                </a>
              </div>
            ) : null}
            {contactUrl ? (
              <div className="button-row qr-actions">
                {googleWalletPreviewUrl ? (
                  <a className="primary-button" href={googleWalletPreviewUrl}>
                    Add to Google Wallet
                  </a>
                ) : (
                  <span className="micro-copy">
                    Add Google Wallet credentials to turn on your Android wallet pass.
                  </span>
                )}
                {profile?.wallet_apple_url ? (
                  <a className="ghost-button" href={profile.wallet_apple_url}>
                    Add to Apple Wallet
                  </a>
                ) : (
                  <span className="micro-copy">Connect your Apple Wallet pass URL above to carry this QR on iPhone.</span>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">Event page</div>
              <h2>Optional on Pro</h2>
            </div>
            <span className="badge">{event?.published ? "Published" : "Draft"}</span>
          </div>

          {eventsEnabled ? (
            <>
              <form action={saveEventAction} className="stack-form">
                <input name="event_id" type="hidden" value={event?.id || ""} />
                <label>
                  Event title
                  <input defaultValue={event?.title || ""} name="title" type="text" />
                </label>
                <label>
                  Event slug
                  <input defaultValue={event?.slug || "next-event"} name="slug" type="text" />
                </label>
                <label>
                  Location
                  <input defaultValue={event?.location || ""} name="location" type="text" />
                </label>
                <div className="sub-grid">
                  <label>
                    Starts
                    <input defaultValue={event?.starts_at?.slice(0, 16) || ""} name="starts_at" type="datetime-local" />
                  </label>
                  <label>
                    Ends
                    <input defaultValue={event?.ends_at?.slice(0, 16) || ""} name="ends_at" type="datetime-local" />
                  </label>
                </div>
                <div className="sub-grid">
                  <label>
                    Timezone
                    <input defaultValue={event?.timezone || "America/Chicago"} name="timezone" type="text" />
                  </label>
                  <label>
                    Capacity
                    <input defaultValue={event?.capacity || ""} min={1} name="capacity" type="number" />
                  </label>
                </div>
                <label>
                  Summary
                  <textarea defaultValue={event?.summary || ""} name="summary" />
                </label>
                <label>
                  <input defaultChecked={event?.rsvp_enabled ?? true} name="rsvp_enabled" type="checkbox" />
                  <span>Allow RSVP on the event page</span>
                </label>
                <button className="primary-button full-width" type="submit">
                  Save event page
                </button>
              </form>

              <form action={toggleEventPublishAction} className="button-row">
                <input name="event_id" type="hidden" value={event?.id || ""} />
                <input name="next" type="hidden" value={event?.published ? "false" : "true"} />
                <button className="ghost-button" type="submit">
                  {event?.published ? "Unpublish event page" : "Publish event page"}
                </button>
              </form>

              <div className="dashboard-links">
                <div className="link-tile">
                  <strong>Event page URL</strong>
                  <span className="micro-copy">
                    {eventUrl ? formatDateRange(event?.starts_at, event?.ends_at, event?.timezone || undefined) : "Save and publish the event page to create the live route."}
                  </span>
                  {eventUrl ? <code>{eventUrl}</code> : null}
                </div>
              </div>
            </>
          ) : (
            <div className="notice">
              <p className="micro-copy">
                Pro unlocks event pages, RSVP, and add-to-calendar. Your main QR still stays the same.
              </p>
              <Link className="ghost-button" href="/signup?plan=pro">
                Upgrade to Pro
              </Link>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-eyebrow">Billing</div>
          <h2>Current plan</h2>
          <p className="micro-copy">
            {accessIsActive
              ? `You are on ${plan.name}.`
              : "Finish checkout to publish your page and keep the QR live."}
          </p>
          <div className="dashboard-links">
            <div className="link-tile">
              <strong>Status</strong>
              <span>{subscription?.status || "No active subscription"}</span>
            </div>
            <div className="link-tile">
              <strong>Plan</strong>
              <span>{plan.name}</span>
            </div>
          </div>
          {!accessIsActive ? (
            <div className="button-row" style={{ marginTop: 18 }}>
              <form action="/api/checkout/session" method="post">
                <input name="plan" type="hidden" value={currentPlanId === "pro" ? "pro" : "starter"} />
                <button className="ghost-button" type="submit">
                  {currentPlanId === "pro" ? "Continue Pro checkout" : "Continue Starter checkout"}
                </button>
              </form>
              {currentPlanId !== "pro" ? (
                <form action="/api/checkout/session" method="post">
                  <input name="plan" type="hidden" value="pro" />
                  <button className="primary-button" type="submit">
                    Upgrade to Pro checkout
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
