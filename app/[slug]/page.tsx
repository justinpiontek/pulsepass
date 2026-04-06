import Link from "next/link";
import { notFound } from "next/navigation";

import { BRAND_NAME } from "@/lib/brand";
import { getPublicProfileBySlug } from "@/lib/data";
import { hasSupabasePublicEnv } from "@/lib/env";
import { formatDateRange, toVCard } from "@/lib/utils";

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
    <main className="public-shell">
      <section className="public-card">
        <div className="section-eyebrow">{BRAND_NAME} contact page</div>
        <h1>{profile.full_name || profile.company_name || "Contact page"}</h1>
        <p className="lead">{profile.contact_headline || profile.job_title || profile.company_name || "Stay connected."}</p>
        {profile.bio ? <p className="public-copy">{profile.bio}</p> : null}

        <div className="public-actions">
          <a download={`${profile.slug}.vcf`} href={vcardHref}>
            Save contact
          </a>
          {profile.phone ? <a href={`tel:${profile.phone}`}>Call</a> : null}
          <a href={`mailto:${profile.email}`}>Email</a>
          {profile.website ? <a href={profile.website}>Website</a> : null}
        </div>
      </section>

      {featuredEvent ? (
        <section className="public-card">
          <div className="section-eyebrow">Linked event</div>
          <h2>{featuredEvent.title}</h2>
          <p className="public-meta">{formatDateRange(featuredEvent.starts_at, featuredEvent.ends_at, featuredEvent.timezone || undefined)}</p>
          {featuredEvent.location ? <p className="public-copy">{featuredEvent.location}</p> : null}
          {featuredEvent.summary ? <p className="public-copy">{featuredEvent.summary}</p> : null}
          <Link className="primary-button" href={`/${profile.slug}/events/${featuredEvent.slug}`}>
            Open event page
          </Link>
        </section>
      ) : null}
    </main>
  );
}
