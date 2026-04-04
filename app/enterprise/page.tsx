import { PublicNav } from "@/components/public-nav";
import { getSupportEmail } from "@/lib/env";

type EnterprisePageProps = {
  searchParams: Promise<{
    submitted?: string;
  }>;
};

export default async function EnterprisePage({ searchParams }: EnterprisePageProps) {
  const query = await searchParams;

  return (
    <>
      <PublicNav />
      <main className="auth-shell page-shell">
        <section className="panel panel--wide">
          <div className="section-eyebrow">Enterprise</div>
          <h1 className="page-title">Roll out PulsePass across your organization.</h1>
          <p className="lead">
            Use Enterprise for bulk employee rollout, department templates, and centrally managed event campaigns.
            Pricing changes by seat count, rollout scope, and onboarding needs.
          </p>
          {query.submitted === "1" ? (
            <p className="status-message">Your request was sent. Sales can follow up from here.</p>
          ) : null}
        </section>

        <div className="auth-layout">
          <section className="panel">
            <div className="section-eyebrow">What Enterprise covers</div>
            <div className="feature-grid">
              <article className="feature-card">
                <strong>Bulk rollout</strong>
                <p className="micro-copy">Launch hundreds of employee pages with one company-standard setup.</p>
              </article>
              <article className="feature-card">
                <strong>Admin control</strong>
                <p className="micro-copy">Manage templates, departments, seats, and publishing centrally.</p>
              </article>
              <article className="feature-card">
                <strong>Custom pricing</strong>
                <p className="micro-copy">Pricing changes by seat count, rollout scope, and support needs.</p>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="section-eyebrow">Talk to sales</div>
            <form action="/api/enterprise" className="stack-form" method="post">
              <label>
                Full name
                <input name="fullName" required type="text" />
              </label>
              <label>
                Work email
                <input name="workEmail" required type="email" />
              </label>
              <label>
                Company name
                <input name="companyName" required type="text" />
              </label>
              <label>
                Employee count
                <input min={1} name="employeeCount" type="number" />
              </label>
              <label>
                Notes
                <textarea name="notes" placeholder="Tell us how you want to roll this out." />
              </label>
              <button className="primary-button full-width" type="submit">
                Request pricing
              </button>
            </form>
            <p className="micro-copy">
              Prefer email? <a href={`mailto:${getSupportEmail()}`}>{getSupportEmail()}</a>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
