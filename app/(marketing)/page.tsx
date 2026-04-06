import Link from "next/link";

import { PublicNav } from "@/components/public-nav";
import { BRAND_NAME } from "@/lib/brand";
import { PLANS } from "@/lib/plans";

const PLAN_META = {
  starter: {
    audience: "Best for individuals who mainly need a polished contact page.",
    pill: "Solo",
    cta: "Start Starter"
  },
  pro: {
    audience: "Best for people who want events, RSVP, and one stronger all-in-one QR flow.",
    pill: "Most popular",
    cta: "Start Pro"
  },
  enterprise: {
    audience: "Best for teams and organizations rolling this out across many people.",
    pill: "Custom rollout",
    cta: "Talk to sales"
  }
} as const;

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <main className="page-shell">
        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">One live QR for your business card and events</div>
              <h1>Share your contact page. Add events when you need them.</h1>
              <p className="lead">
                Publish a digital contact page, keep one QR live, and add an event page without reprinting
                the code.
              </p>
              <div className="hero-actions">
                <Link className="primary-button" href="/signup?plan=pro">
                  Start with Pro
                </Link>
                <Link className="ghost-button" href="#pricing">
                  See pricing
                </Link>
              </div>
              <div className="metric-row">
                <div className="metric">
                  <strong>1 QR</strong>
                  <span>Keep the same code live while you update the page behind it.</span>
                </div>
                <div className="metric">
                  <strong>2 page types</strong>
                  <span>Contact page first, event page when you need RSVP and calendar actions.</span>
                </div>
                <div className="metric">
                  <strong>0 guesswork</strong>
                  <span>Signup, checkout, publish, and share without a confusing setup flow.</span>
                </div>
              </div>
            </div>

            <aside className="hero-card">
              <div className="section-eyebrow">What people get after the scan</div>
              <div className="feature-grid">
                <article className="feature-card">
                  <strong>Contact page</strong>
                  <p className="micro-copy">Phone, email, website, save contact, and wallet links in one place.</p>
                </article>
                <article className="feature-card">
                  <strong>Event page</strong>
                  <p className="micro-copy">RSVP, location, date, and add-to-calendar from that same scan flow.</p>
                </article>
                <article className="feature-card">
                  <strong>Always updateable</strong>
                  <p className="micro-copy">Change your details later without replacing the printed QR.</p>
                </article>
              </div>
            </aside>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">How it works</div>
              <h2>Simple from the first click.</h2>
            </div>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <strong>1. Start your account</strong>
              <p className="micro-copy">Choose Starter or Pro and finish secure checkout.</p>
            </article>
            <article className="feature-card">
              <strong>2. Publish your page</strong>
              <p className="micro-copy">Add your contact details and publish your live contact route.</p>
            </article>
            <article className="feature-card">
              <strong>3. Share one QR</strong>
              <p className="micro-copy">Use that same QR on cards, signs, booths, or print. Add an event later if you want.</p>
            </article>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Pricing</div>
              <h2>Pick the path that fits how you share.</h2>
              <p className="micro-copy pricing-intro">
                Every plan starts with your hosted contact page and one live QR. Move to Pro when you want
                event tools. Enterprise pricing changes by rollout size.
              </p>
            </div>
          </div>

          <div className="plan-grid">
            <article className="plan-card pricing-card">
              <div className="plan-pill">{PLAN_META.starter.pill}</div>
              <div className="plan-card__title-row">
                <strong>{PLANS.starter.name}</strong>
              </div>
              <div className="plan-price">
                <span className="plan-price__amount">{PLANS.starter.priceHeadline}</span>
                <span className="plan-price__unit">{PLANS.starter.priceSuffix}</span>
              </div>
              <p className="plan-card__copy">{PLANS.starter.description}</p>
              <p className="plan-kicker">{PLAN_META.starter.audience}</p>
              <ul className="feature-list">
                {PLANS.starter.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className="primary-button" href="/signup?plan=starter">
                {PLAN_META.starter.cta}
              </Link>
            </article>

            <article className="plan-card pricing-card pricing-card--featured selected">
              <div className="plan-pill plan-pill--featured">{PLAN_META.pro.pill}</div>
              <div className="plan-card__title-row">
                <strong>{PLANS.pro.name}</strong>
              </div>
              <div className="plan-price">
                <span className="plan-price__amount">{PLANS.pro.priceHeadline}</span>
                <span className="plan-price__unit">{PLANS.pro.priceSuffix}</span>
              </div>
              <p className="plan-card__copy">{PLANS.pro.description}</p>
              <p className="plan-kicker">{PLAN_META.pro.audience}</p>
              <ul className="feature-list">
                {PLANS.pro.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className="primary-button" href="/signup?plan=pro">
                {PLAN_META.pro.cta}
              </Link>
            </article>

            <article className="plan-card pricing-card">
              <div className="plan-pill">{PLAN_META.enterprise.pill}</div>
              <div className="plan-card__title-row">
                <strong>{PLANS.enterprise.name}</strong>
              </div>
              <div className="plan-price plan-price--custom">
                <span className="plan-price__amount">{PLANS.enterprise.priceHeadline}</span>
                <span className="plan-price__unit">{PLANS.enterprise.priceSuffix}</span>
              </div>
              <p className="plan-card__copy">{PLANS.enterprise.description}</p>
              <p className="plan-kicker">{PLAN_META.enterprise.audience}</p>
              <ul className="feature-list">
                {PLANS.enterprise.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className="ghost-button" href="/enterprise">
                {PLAN_META.enterprise.cta}
              </Link>
            </article>
          </div>

          <div className="pricing-reassurance">
            <div className="pricing-reassurance__item">
              <strong>Hosted page included</strong>
              <span>Your public contact page is part of every plan.</span>
            </div>
            <div className="pricing-reassurance__item">
              <strong>One QR stays live</strong>
              <span>Update the page behind the code without replacing the print.</span>
            </div>
            <div className="pricing-reassurance__item">
              <strong>Enterprise is quoted</strong>
              <span>Pricing changes by seat count, rollout scope, and onboarding.</span>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">{BRAND_NAME} keeps your contact page and event page behind one live QR.</footer>
    </>
  );
}
