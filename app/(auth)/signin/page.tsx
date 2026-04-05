import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicNav } from "@/components/public-nav";
import { SigninForm } from "@/components/signin-form";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const nextPath = query.next || "/dashboard";

  if (hasSupabasePublicEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user && !query.checkout) {
      redirect(nextPath);
    }
  }

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
          nextPath={nextPath}
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
