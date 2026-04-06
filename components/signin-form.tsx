"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { hasSupabasePublicEnv } from "@/lib/env";
import { hasActiveAccess } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SigninFormProps = {
  billingState?: string;
  checkoutPlan?: string;
  defaultEmail?: string;
  nextPath?: string;
};

export function SigninForm({
  billingState,
  checkoutPlan,
  defaultEmail = "",
  nextPath = "/dashboard"
}: SigninFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [pendingCheckoutUserId, setPendingCheckoutUserId] = useState<string | null>(null);
  const canSubmit = hasSupabasePublicEnv();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    startTransition(() => {
      void submitSignin();
    });
  }

  async function beginCheckout(plan: "starter" | "pro", userId: string) {
    const supabase = createSupabaseBrowserClient();
    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plan,
        email,
        userId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      await supabase.auth.signOut();
      throw new Error(payload?.error || "We could not start checkout.");
    }

    const payload = (await response.json()) as { url: string };
    await supabase.auth.signOut();
    window.location.assign(payload.url);
  }

  async function submitSignin() {
    try {
      const supabase = createSupabaseBrowserClient();
      setPendingCheckoutUserId(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("We could not confirm your account.");
      }

      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("plan,status")
        .eq("profile_id", data.user.id)
        .maybeSingle<{ plan: string; status: string }>();

      if (subscriptionError) {
        await supabase.auth.signOut();
        throw subscriptionError;
      }

      const accessIsActive = hasActiveAccess(subscription?.status);

      if (!accessIsActive && (checkoutPlan === "starter" || checkoutPlan === "pro")) {
        await beginCheckout(checkoutPlan, data.user.id);
        return;
      }

      if (!accessIsActive) {
        if (billingState === "success") {
          await supabase.auth.signOut();
          throw new Error("Payment was received. We are still finishing setup. Try signing in again in a moment.");
        }

        setPendingCheckoutUserId(data.user.id);
        setInfoMessage("Choose Starter or Pro below to finish checkout without signing in again.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We could not sign you in.");
    }
  }

  return (
    <section className="panel auth-panel">
      <div className="section-eyebrow">{checkoutPlan ? "Resume payment" : "Member access"}</div>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <button className="primary-button full-width" disabled={isPending || !canSubmit} type="submit">
          {isPending ? "Checking account..." : checkoutPlan ? "Continue to secure checkout" : "Open dashboard"}
        </button>
      </form>
      {pendingCheckoutUserId ? (
        <div className="signup-inline-note">
          <strong>Finish activation</strong>
          <span>Pick the plan you want and we will take you straight to secure checkout.</span>
          <div className="button-row">
            <button
              className="ghost-button"
              onClick={() => {
                startTransition(() => {
                  void beginCheckout("starter", pendingCheckoutUserId);
                });
              }}
              type="button"
            >
              Continue with Starter
            </button>
            <button
              className="primary-button"
              onClick={() => {
                startTransition(() => {
                  void beginCheckout("pro", pendingCheckoutUserId);
                });
              }}
              type="button"
            >
              Continue with Pro
            </button>
          </div>
        </div>
      ) : null}
      {!canSubmit ? (
        <p className="status-message">
          Add your Supabase and Stripe keys in `.env`, then sign in here once the backend is connected.
        </p>
      ) : null}
      {infoMessage ? <p className="status-message">{infoMessage}</p> : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
    </section>
  );
}
