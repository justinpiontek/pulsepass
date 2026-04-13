import type { CSSProperties } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { BRAND_NAME } from "@/lib/brand";
import { getPublicProfileBySlug } from "@/lib/data";
import { hasSupabasePublicEnv } from "@/lib/env";
import { getCompanyLogoUrl, getProfilePhotoUrl } from "@/lib/storage";
import { buildBrandThemeVariables, formatDateRange, toVCard } from "@/lib/utils";

type ContactPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ContactPage({ params }: ContactPageProps) {
  if (!hasSupabasePublicEnv()) {
    notFound();
  }

  const { slug } = await params;
  const data = await getPublicProfileBySlug(slug);

  if (!data) {
    notFound();
  }

  const { profile, featuredEvent } = data;
  const profilePhotoUrl = getProfilePhotoUrl(profile.profile_photo_path);
  const companyLogoUrl = getCompanyLogoUrl(profile.company_logo_path);
  const themeStyle = buildBrandThemeVariables(profile.brand_color) as CSSProperties;
  const socialLinks = [
    { label: "LinkedIn", href: profile.linkedin_url },
    { label: "Instagram", href: profile.instagram_url },
    { label: "Facebook", href: profile.facebook_url },
    { label: "X", href: profile.x_url }
  ].filter((entry): entry is { label: string; href: string } => Boolean(entry.href));
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(
    toVCard({
      full_name: profile.full_name,
      company_name: profile.company_name,
      job_title: profile.job_title,
      phone: profile.phone,
      email: profile.email,
      website: profile.website
    })
  )}`;

  return (
    <main className="public-shell public-shell--brand" style={themeStyle}>
      <section className="public-card public-card--brand public-card--contact">
        <div className="public-hero">
          <div className="public-hero__band">
            <div className="section-eyebrow">{BRAND_NAME} contact page</div>
            {companyLogoUrl ? (
              <div className="public-logo-card">
                <img
                  alt={`${profile.company_name || profile.full_name || "Company"} logo`}
                  className="public-company-logo"
                  src={companyLogoUrl}
                />
              </div>
            ) : profile.company_name ? (
              <div className="public-logo-card public-logo-card--fallback">
                <strong>{profile.company_name}</strong>
              </div>
            ) : null}
          </div>

          <div className="public-identity-card">
            {profilePhotoUrl ? (
              <img alt={`${profile.full_name || profile.company_name || "Profile"} photo`} className="public-profile-photo" src={profilePhotoUrl} />
            ) : (
              <div className="public-profile-fallback">
                {(profile.full_name || profile.company_name || "C").slice(0, 1)}
              </div>
            )}
            <div className="public-identity__copy">
              <h1 className="public-name">{profile.full_name || profile.company_name || "Contact page"}</h1>
              <p className="public-role">
                {profile.contact_headline || profile.job_title || profile.company_name || "Stay connected."}
              </p>
              {profile.company_name && profile.full_name ? <p className="public-company-line">{profile.company_name}</p> : null}
            </div>
          </div>
        </div>

        <div className="public-content-stack">
          {profile.bio ? (
            <section className="public-section-block">
              <div className="public-section-heading">About</div>
              <p className="public-copy">{profile.bio}</p>
            </section>
          ) : null}

          <section className="public-section-block">
            <div className="public-section-heading">Quick actions</div>
            <div className="public-action-stack">
              <a className="primary-button public-action-primary" download={`${profile.slug}.vcf`} href={vcardHref}>
                Save contact
              </a>
              <div className="public-action-grid">
                {profile.phone ? (
                  <a className="ghost-button public-action-secondary" href={`tel:${profile.phone}`}>
                    Call
                  </a>
                ) : null}
                <a className="ghost-button public-action-secondary" href={`mailto:${profile.email}`}>
                  Email
                </a>
                {profile.website ? (
                  <a className="ghost-button public-action-secondary" href={profile.website}>
                    Website
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          {socialLinks.length ? (
            <section className="public-section-block public-section-block--soft">
              <div className="public-section-heading">Social links</div>
              <div className="public-socials">
                {socialLinks.map((entry) => (
                  <a className="public-social-link" href={entry.href} key={entry.label} rel="noreferrer" target="_blank">
                    {entry.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      {featuredEvent ? (
        <section className="public-card public-card--brand public-card--event-preview">
          <div className="section-eyebrow">Linked event</div>
          <div className="public-event-preview">
            <div>
              <h2>{featuredEvent.title}</h2>
              <p className="public-meta">{formatDateRange(featuredEvent.starts_at, featuredEvent.ends_at, featuredEvent.timezone || undefined)}</p>
              {featuredEvent.location ? <p className="public-copy">{featuredEvent.location}</p> : null}
              {featuredEvent.summary ? <p className="public-copy">{featuredEvent.summary}</p> : null}
            </div>
            <Link className="primary-button" href={`/${profile.slug}/events/${featuredEvent.slug}`}>
              Open event page
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
