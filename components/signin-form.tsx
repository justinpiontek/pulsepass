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
  const canSubmit = hasSupabasePublicEnv();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    startTransition(() => {
      void submitSignin();
    });
  }

  async function submitSignin() {
    try {
      const supabase = createSupabaseBrowserClient();
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
        const response = await fetch("/api/checkout/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            plan: checkoutPlan,
            email,
            userId: data.user.id
          })
        });

        if (!response.ok) {
          await supabase.auth.signOut();
          throw new Error("You are signed in, but checkout could not be started.");
        }

        const payload = (await response.json()) as { url: string };
        await supabase.auth.signOut();
        window.location.assign(payload.url);
        return;
      }

      if (!accessIsActive) {
        await supabase.auth.signOut();
        throw new Error(
          billingState === "success"
            ? "Payment was received. We are still finishing setup. Try signing in again in a moment."
            : "Finish checkout before signing in. Choose Starter or Pro to activate your account."
        );
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
      {!canSubmit ? (
        <p className="status-message">
          Add your Supabase and Stripe keys in `.env`, then sign in here once the backend is connected.
        </p>
      ) : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
    </section>
  );
}
