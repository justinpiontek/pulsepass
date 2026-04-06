import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordResetRequestForm } from "@/components/password-reset-request-form";
import { PublicNav } from "@/components/public-nav";
import { SigninForm } from "@/components/signin-form";
import { hasSupabasePublicEnv } from "@/lib/env";
import { hasActiveAccess } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SigninPageProps = {
  searchParams: Promise<{
    billing?: string;
    checkout?: string;
    email?: string;
    next?: string;
    password?: string;
  }>;
};

export default async function SigninPage({ searchParams }: SigninPageProps) {
  const query = await searchParams;
  const nextPath = query.next || "/dashboard";
  const selectedEmail = query.email || "";
  const wantsCheckout = query.checkout === "starter" || query.checkout === "pro";

  function buildSigninHref(checkoutPlan?: string, emailOverride = selectedEmail) {
    const params = new URLSearchParams();

    if (query.billing) {
      params.set("billing", query.billing);
    }

    if (checkoutPlan) {
      params.set("checkout", checkoutPlan);
    } else if (query.checkout) {
      params.set("checkout", query.checkout);
    }

    if (emailOverride) {
      params.set("email", emailOverride);
    }

    if (query.next) {
      params.set("next", query.next);
    }

    const result = params.toString();
    return result ? `/signin?${result}` : "/signin";
  }

  if (hasSupabasePublicEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("profile_id", user.id)
        .maybeSingle<{ status: string }>();

      if (hasActiveAccess(subscription?.status)) {
        redirect(nextPath);
      } else {
        const email = selectedEmail || user.email || "";
        redirect(`/auth/signout?next=${encodeURIComponent(buildSigninHref(query.checkout, email))}`);
      }
    }
  }

  return (
    <>
      <PublicNav />
      <main className="auth-shell page-shell">
        <section className="panel panel--wide">
          <div className="section-eyebrow">{wantsCheckout || query.billing === "required" ? "Resume checkout" : "Paid sign in"}</div>
          <h1 className="page-title">
            {wantsCheckout || query.billing === "required"
              ? "Finish checkout to activate your account."
              : "Sign in to manage your paid account."}
          </h1>
          <p className="lead">
            {wantsCheckout || query.billing === "required"
              ? "Use your password to confirm your login, then continue to secure payment. Your dashboard opens after billing is active."
              : "Use this sign-in for active Starter and Pro accounts when you want to update your page, publish changes, or download your QR."}
          </p>
          {query.billing === "success" ? (
            <p className="status-message">Payment was completed. Sign in once to finish setup and publish your page.</p>
          ) : null}
          {query.billing === "required" ? (
            <p className="status-message">
              Your login exists, but billing is not active yet. Finish checkout before signing in to the dashboard.
            </p>
          ) : null}
          {query.password === "updated" ? (
            <p className="status-message">Your password was updated. Sign in with the new password.</p>
          ) : null}
          {query.billing === "required" && !wantsCheckout ? (
            <div className="button-row">
              <Link className="ghost-button" href={buildSigninHref("starter")}>
                Continue with Starter
              </Link>
              <Link className="primary-button" href={buildSigninHref("pro")}>
                Continue with Pro
              </Link>
            </div>
          ) : null}
        </section>

        <SigninForm
          billingState={query.billing}
          checkoutPlan={query.checkout}
          defaultEmail={query.email}
          nextPath={nextPath}
        />

        <PasswordResetRequestForm defaultEmail={query.email} />

        <section className="panel">
          <p className="micro-copy">
            Need a paid account? <Link href="/signup">Start here</Link>.
          </p>
        </section>
      </main>
    </>
  );
}
