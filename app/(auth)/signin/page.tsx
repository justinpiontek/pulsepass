import Link from "next/link";

import { PublicNav } from "@/components/public-nav";
import { SigninForm } from "@/components/signin-form";

type SigninPageProps = {
  searchParams: Promise<{
    billing?: string;
    checkout?: string;
    email?: string;
    next?: string;
  }>;
};

export default async function SigninPage({ searchParams }: SigninPageProps) {
  const query = await searchParams;

  return (
    <>
      <PublicNav />
      <main className="auth-shell page-shell">
        <section className="panel panel--wide">
          <div className="section-eyebrow">Welcome back</div>
          <h1 className="page-title">Sign in and keep moving.</h1>
          <p className="lead">Open your dashboard, continue checkout, or publish the latest version of your page.</p>
          {query.billing === "success" ? (
            <p className="status-message">Payment was completed. Sign in to finish setup and publish your page.</p>
          ) : null}
        </section>

        <SigninForm
          checkoutPlan={query.checkout}
          defaultEmail={query.email}
          nextPath={query.next || "/dashboard"}
        />

        <section className="panel">
          <p className="micro-copy">
            Need a new account? <Link href="/signup">Start here</Link>.
          </p>
        </section>
      </main>
    </>
  );
}
