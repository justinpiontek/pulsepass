"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SigninFormProps = {
  checkoutPlan?: string;
  defaultEmail?: string;
  nextPath?: string;
};

export function SigninForm({ checkoutPlan, defaultEmail = "", nextPath = "/dashboard" }: SigninFormProps) {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (checkoutPlan === "starter" || checkoutPlan === "pro") {
        const response = await fetch("/api/checkout/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            plan: checkoutPlan,
            email
          })
        });

        if (!response.ok) {
          throw new Error("You are signed in, but checkout could not be started.");
        }

        const payload = (await response.json()) as { url: string };
        window.location.assign(payload.url);
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
      <div className="section-eyebrow">Sign in</div>
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
          {isPending ? "Signing in..." : checkoutPlan ? "Sign in and continue checkout" : "Sign in"}
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
