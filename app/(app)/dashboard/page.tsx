import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createCardAction,
  saveCardAction,
  saveEventAction,
  toggleCardPublishAction,
  toggleEventPublishAction
} from "@/app/(app)/dashboard/actions";
import { BRAND_NAME } from "@/lib/brand";
import { getDashboardData } from "@/lib/data";
import { hasGoogleWalletEnv, hasSupabasePublicEnv } from "@/lib/env";
import { allowsEvents, getCardLimit, getPlan, hasActiveAccess } from "@/lib/plans";
import { buildQrCodePath } from "@/lib/qr";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfilePhotoUrl } from "@/lib/storage";
import { absoluteUrl, formatDateRange } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<{
    billing?: string;
    card?: string;
    created?: string;
    error?: string;
    published?: string;
    saved?: string;
  }>;
};

function formatDashboardError(error?: string) {
  if (!error) {
    return null;
  }

  if (error === "upgrade") {
    return "This action needs an active Pro subscription.";
  }

  if (error === "billing") {
    return "Finish billing before publishing your page.";
  }

  if (error === "card-limit") {
    return "You have reached your plan limit for cards. Starter includes 1 card and Pro includes up to 3.";
  }

  return error;
}

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
            `.env.example` to `.env`, add your keys, and run the SQL migrations in Supabase.
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

  const { account, cards, selectedCard, event, subscription } = await getDashboardData(user.id, query.card);
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

  const cardLimit = getCardLimit(subscription?.plan);
  const eventsEnabled = allowsEvents(subscription?.plan);
  const selectedCardName =
    selectedCard?.contact_headline ||
    selectedCard?.full_name ||
    selectedCard?.company_name ||
    "Selected card";
  const cardSlug = selectedCard?.slug || (user.email?.split("@")[0] ?? user.id.slice(0, 8));
  const contactUrl = selectedCard?.contact_published ? absoluteUrl(`/${cardSlug}`) : null;
  const eventUrl =
    selectedCard?.contact_published && event?.published ? absoluteUrl(`/${cardSlug}/events/${event.slug}`) : null;
  const qrPreviewUrl = contactUrl
    ? buildQrCodePath({
        data: contactUrl,
        filename: `${cardSlug}-contact-qr`,
        format: "svg",
        size: 360
      })
    : null;
  const qrDownloadPngUrl = contactUrl
    ? buildQrCodePath({
        data: contactUrl,
        download: true,
        filename: `${cardSlug}-contact-qr`,
        format: "png",
        size: 1200
      })
    : null;
  const qrDownloadSvgUrl = contactUrl
    ? buildQrCodePath({
        data: contactUrl,
        download: true,
        filename: `${cardSlug}-contact-qr`,
        format: "svg",
        size: 1200
      })
    : null;
  const googleWalletPreviewUrl =
    contactUrl && googleWalletIsReady && selectedCard ? absoluteUrl(`/api/wallet/google/${cardSlug}`) : null;
  const profilePhotoUrl = getProfilePhotoUrl(selectedCard?.profile_photo_path);
  const canCreateCard = cards.length < cardLimit;
  const dashboardError = formatDashboardError(query.error);

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
              <h1 className="page-title">Manage your cards under one paid account.</h1>
              <p className="lead">
                Keep one login and one subscription, then create separate public cards for different roles,
                companies, or audiences.
              </p>
            </div>
            <span className="badge">{plan.name} active</span>
          </div>

          {query.saved ? <p className="status-message">Saved. Your dashboard is up to date.</p> : null}
          {query.published ? <p className="status-message">Publishing status updated.</p> : null}
          {query.created === "card" ? <p className="status-message">New card created. You can edit it now.</p> : null}
          {dashboardError ? <p className="status-message error">{dashboardError}</p> : null}

          <div className="stat-row">
            <div className="stat">
              <strong>{plan.name}</strong>
              <span>{plan.priceLabel}</span>
            </div>
            <div className="stat">
              <strong>
                {cards.length} / {cardLimit === 5000 ? "custom" : cardLimit}
              </strong>
              <span>Cards on this plan</span>
            </div>
            <div className="stat">
              <strong>{selectedCard?.contact_published ? "QR live" : "QR pending"}</strong>
              <span>
                {contactUrl ? "This selected card is live behind its QR." : "Publish the selected card to go live."}
              </span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">Your cards</div>
              <h2>One account, multiple roles</h2>
            </div>
            <span className="badge">
              {cards.length}/{cardLimit === 5000 ? "Custom" : cardLimit}
            </span>
          </div>

          <div className="card-list">
            {cards.map((card) => {
              const isActive = selectedCard?.id === card.id;

              return (
                <Link
                  className={`card-tile ${isActive ? "is-active" : ""}`}
                  href={`/dashboard?card=${encodeURIComponent(card.id)}`}
                  key={card.id}
                >
                  <div className="card-tile__title">
                    <strong>{card.contact_headline || card.full_name || card.company_name || "Untitled card"}</strong>
                    {card.is_primary ? <span className="badge">Primary</span> : null}
                  </div>
                  <div className="card-tile__meta">
                    <span>{card.company_name || card.job_title || card.email}</span>
                    <span>{card.contact_published ? "Published" : "Draft"}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="button-row">
            <form action={createCardAction}>
              <button className="primary-button" disabled={!canCreateCard} type="submit">
                {canCreateCard ? "Create another card" : "Card limit reached"}
              </button>
            </form>
            {!canCreateCard && plan.id !== "pro" ? (
              <form action="/api/checkout/session" method="post">
                <input name="plan" type="hidden" value="pro" />
                <button className="ghost-button" type="submit">
                  Upgrade to Pro
                </button>
              </form>
            ) : null}
          </div>
          <p className="micro-copy">
            Starter includes 1 card. Pro includes up to 3 cards. Each card gets its own page, QR, and wallet pass.
          </p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">Selected card</div>
              <h2>{selectedCardName}</h2>
            </div>
            <span className="badge">{selectedCard?.contact_published ? "Published" : "Draft"}</span>
          </div>

          {selectedCard ? (
            <>
              <form action={saveCardAction} className="stack-form" encType="multipart/form-data">
                <input name="card_id" type="hidden" value={selectedCard.id} />
                <div className="profile-photo-field">
                  {profilePhotoUrl ? (
                    <img
                      alt={`${selectedCard.full_name || selectedCard.company_name || "Profile"} photo`}
                      className="profile-photo-preview"
                      src={profilePhotoUrl}
                    />
                  ) : (
                    <div className="profile-photo-placeholder">
                      <strong>{(selectedCard.full_name || selectedCard.company_name || "C").slice(0, 1)}</strong>
                      <span>Add a headshot or logo</span>
                    </div>
                  )}
                  <div className="profile-photo-copy">
                    <label>
                      Profile photo
                      <input accept="image/png,image/jpeg,image/webp,image/heic,image/heif" name="profile_photo" type="file" />
                    </label>
                    <p className="micro-copy">Upload a square headshot or logo. PNG, JPG, WebP, or HEIC up to 5 MB.</p>
                  </div>
                  <input name="existing_profile_photo_path" type="hidden" value={selectedCard.profile_photo_path || ""} />
                </div>

                <label>
                  Full name
                  <input defaultValue={selectedCard.full_name || ""} name="full_name" type="text" />
                </label>
                <label>
                  Company name
                  <input defaultValue={selectedCard.company_name || ""} name="company_name" type="text" />
                </label>
                <label>
                  Job title
                  <input defaultValue={selectedCard.job_title || ""} name="job_title" type="text" />
                </label>
                <div className="sub-grid">
                  <label>
                    Public email
                    <input defaultValue={selectedCard.email || user.email || ""} name="email" type="email" />
                  </label>
                  <label>
                    Phone
                    <input defaultValue={selectedCard.phone || ""} name="phone" type="tel" />
                  </label>
                </div>
                <label>
                  Website
                  <input defaultValue={selectedCard.website || ""} name="website" type="url" />
                </label>
                <div className="sub-grid">
                  <label>
                    LinkedIn
                    <input defaultValue={selectedCard.linkedin_url || ""} name="linkedin_url" type="url" />
                  </label>
                  <label>
                    Instagram
                    <input defaultValue={selectedCard.instagram_url || ""} name="instagram_url" type="url" />
                  </label>
                </div>
                <div className="sub-grid">
                  <label>
                    Facebook
                    <input defaultValue={selectedCard.facebook_url || ""} name="facebook_url" type="url" />
                  </label>
                  <label>
                    X
                    <input defaultValue={selectedCard.x_url || ""} name="x_url" type="url" />
                  </label>
                </div>
                <label>
                  Public slug
                  <input defaultValue={cardSlug} name="slug" type="text" />
                </label>
                <label>
                  Headline
                  <input defaultValue={selectedCard.contact_headline || ""} name="contact_headline" type="text" />
                </label>
                <label>
                  Short bio
                  <textarea defaultValue={selectedCard.bio || ""} name="bio" />
                </label>
                <label>
                  Apple Wallet QR pass URL
                  <input defaultValue={selectedCard.wallet_apple_url || ""} name="wallet_apple_url" type="url" />
                </label>
                <label>
                  Google Wallet QR pass override URL
                  <input defaultValue={selectedCard.wallet_google_url || ""} name="wallet_google_url" type="url" />
                </label>
                <p className="micro-copy">
                  These wallet passes are for you to carry this card’s QR at events. People scan your QR, then land on
                  this card and tap Save contact.
                </p>
                <div className="dashboard-links">
                  <div className="link-tile">
                    <strong>Google Wallet status</strong>
                    <span className="micro-copy">
                      {googleWalletIsReady
                        ? "Your Android QR pass can be added from the dashboard once this card is live."
                        : "Add Google Wallet issuer credentials in your environment to turn on your Android QR pass."}
                    </span>
                    {googleWalletPreviewUrl ? <code>{googleWalletPreviewUrl}</code> : null}
                  </div>
                  <div className="link-tile">
                    <strong>Apple Wallet status</strong>
                    <span className="micro-copy">
                      {selectedCard.wallet_apple_url
                        ? "Your Apple Wallet QR pass URL is connected."
                        : "Apple Wallet still needs a signed .pkpass link before you can carry this QR in Wallet on iPhone."}
                    </span>
                  </div>
                </div>
                <button className="primary-button full-width" type="submit">
                  Save card
                </button>
              </form>

              <form action={toggleCardPublishAction} className="button-row">
                <input name="card_id" type="hidden" value={selectedCard.id} />
                <input name="next" type="hidden" value={selectedCard.contact_published ? "false" : "true"} />
                <button className="ghost-button" type="submit">
                  {selectedCard.contact_published ? "Unpublish card" : "Publish card"}
                </button>
              </form>

              <div className="dashboard-links">
                <div className="link-tile">
                  <strong>Card URL</strong>
                  <span className="micro-copy">
                    {contactUrl ? "This is the live route behind this card’s QR." : "Publish this card to create the live route."}
                  </span>
                  {contactUrl ? <code>{contactUrl}</code> : null}
                </div>
              </div>
            </>
          ) : (
            <p className="micro-copy">Create your first card to start building a live QR destination.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">Selected QR</div>
              <h2>Carry this card anywhere</h2>
            </div>
          </div>

          <div className="qr-card">
            {qrPreviewUrl ? (
              <img alt="Live QR code" src={qrPreviewUrl} />
            ) : (
              <p className="micro-copy">Publish this card to generate its live QR destination.</p>
            )}
            <p className="micro-copy">
              Use this on printed cards if you want, or keep it on your phone. At events, open your wallet pass
              or this screen and let people scan. They land on this card and can save your info right away.
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
                  <span className="micro-copy">Add Google Wallet credentials to turn on your Android wallet pass.</span>
                )}
                {selectedCard?.wallet_apple_url ? (
                  <a className="ghost-button" href={selectedCard.wallet_apple_url}>
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
              <h2>{eventsEnabled ? "Optional on this card" : "Upgrade to add events"}</h2>
            </div>
            <span className="badge">{event?.published ? "Published" : "Draft"}</span>
          </div>

          {eventsEnabled && selectedCard ? (
            <>
              <form action={saveEventAction} className="stack-form">
                <input name="card_id" type="hidden" value={selectedCard.id} />
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
                  <span>Allow RSVP on this event page</span>
                </label>
                <button className="primary-button full-width" type="submit">
                  Save event page
                </button>
              </form>

              <form action={toggleEventPublishAction} className="button-row">
                <input name="card_id" type="hidden" value={selectedCard.id} />
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
                    {eventUrl
                      ? formatDateRange(event?.starts_at, event?.ends_at, event?.timezone || undefined)
                      : "Save and publish the event page to create the live route."}
                  </span>
                  {eventUrl ? <code>{eventUrl}</code> : null}
                </div>
              </div>
            </>
          ) : (
            <div className="notice">
              <p className="micro-copy">
                Pro unlocks event pages, RSVP, and add-to-calendar. Each card can have its own event without changing the QR for your other cards.
              </p>
              <form action="/api/checkout/session" className="button-row" method="post">
                <input name="plan" type="hidden" value="pro" />
                <button className="ghost-button" type="submit">
                  Upgrade to Pro
                </button>
              </form>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-eyebrow">Billing</div>
          <h2>Account plan</h2>
          <p className="micro-copy">
            {account?.full_name || account?.company_name || user.email} is on {plan.name}. This account can manage{" "}
            {cardLimit === 5000 ? "a custom number of cards" : `${cardLimit} card${cardLimit === 1 ? "" : "s"}`}.
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
          {plan.id !== "pro" ? (
            <form action="/api/checkout/session" className="button-row" method="post">
              <input name="plan" type="hidden" value="pro" />
              <button className="ghost-button" type="submit">
                Upgrade this account to Pro
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
