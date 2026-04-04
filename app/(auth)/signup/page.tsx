import { PublicNav } from "@/components/public-nav";
import { SignupForm } from "@/components/signup-form";
import type { PlanId } from "@/lib/plans";

type SignupPageProps = {
  searchParams: Promise<{
    billing?: string;
    plan?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const query = await searchParams;
  const plan = query.plan === "pro" ? "pro" : "starter";

  return (
    <>
      <PublicNav />
      <main className="auth-shell page-shell">
        <section className="panel panel--wide signup-hero">
          <div className="section-eyebrow">Create your account</div>
          <h1 className="page-title">Start simple. Checkout is next.</h1>
          <p className="lead">
            Pick your plan, create your login, and move straight into secure payment.
          </p>
          {query.billing === "cancelled" ? (
            <p className="status-message">Checkout was cancelled. Your account can still continue from here.</p>
          ) : null}
        </section>

        <SignupForm initialPlan={plan as PlanId} />
      </main>
    </>
  );
}
