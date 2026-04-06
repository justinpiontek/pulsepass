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
  const planLabel = plan === "pro" ? "Pro" : "Starter";

  return (
    <>
      <PublicNav />
      <main className="auth-shell page-shell">
        <section className="panel panel--wide signup-hero">
          <div className="section-eyebrow">Start your paid account</div>
          <h1 className="page-title">Create your login. Payment activates access.</h1>
          <p className="lead">
            Choose {planLabel}, create your login, and move into secure checkout. Dashboard access turns on
            after billing is active.
          </p>
          {query.billing === "cancelled" ? (
            <p className="status-message">
              Checkout was cancelled. Your login is saved, and you can resume payment from here.
            </p>
          ) : null}
        </section>

        <SignupForm initialPlan={plan as PlanId} />
      </main>
    </>
  );
}
