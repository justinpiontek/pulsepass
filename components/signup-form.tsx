"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { hasSupabasePublicEnv } from "@/lib/env";
import { PLANS, type PlanId, getPlan } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { slugify } from "@/lib/utils";

type SignupFormProps = {
  initialPlan: PlanId;
};

type SignupState = {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
};

function accountAlreadyExists(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already")
  );
}

export function SignupForm({ initialPlan }: SignupFormProps) {
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [form, setForm] = useState<SignupState>({
    fullName: "",
    companyName: "",
    email: "",
    password: ""
  });
  const canSubmit = hasSupabasePublicEnv();

  const selectedPlan = getPlan(plan);

  function updateField(name: keyof SignupState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    startTransition(() => {
      void submitSignup();
    });
  }

  async function startCheckout(options: { email: string; name?: string; userId?: string | null }) {
    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plan,
        email: options.email,
        name: options.name || "",
        userId: options.userId ?? null
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "We could not start checkout.");
    }

    const payload = (await response.json()) as { url: string };
    return payload.url;
  }

  async function resumeExistingAccountCheckout() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });

    if (error || !data.user) {
      await supabase.auth.signOut();
      throw new Error("That email already has an account. Enter the original password to continue checkout.");
    }

    const checkoutUrl = await startCheckout({
      email: form.email,
      name: form.fullName,
      userId: data.user.id
    });

    await supabase.auth.signOut();
    window.location.assign(checkoutUrl);
  }

  async function submitSignup() {
    let createdUserId: string | null = null;

    try {
      const supabase = createSupabaseBrowserClient();
      const computedSlug = slugify(form.companyName || form.fullName || form.email.split("@")[0] || "profile");

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/signin?next=/dashboard`,
          data: {
            full_name: form.fullName,
            company_name: form.companyName,
            slug: computedSlug
          }
        }
      });

      if (error) {
        throw error;
      }

      createdUserId = data.user?.id ?? null;
      await supabase.auth.signOut();
      const checkoutUrl = await startCheckout({
        email: form.email,
        name: form.fullName,
        userId: createdUserId
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not create your account.";

      if (accountAlreadyExists(message)) {
        try {
          await resumeExistingAccountCheckout();
          return;
        } catch (resumeError) {
          setErrorMessage(
            resumeError instanceof Error ? resumeError.message : "We could not continue checkout for that account."
          );
          setInfoMessage("If you already have a paid account, sign in with that password. Otherwise resume checkout here.");
          return;
        }
      }

      if (createdUserId) {
        setErrorMessage(message);
        setInfoMessage("Your login was created, but checkout did not open. Try again or sign in to resume payment.");
        return;
      }

      setErrorMessage(message);
    }
  }

  return (
    <div className="signup-flow">
      <section className="panel signup-panel">
        <div className="signup-steps" aria-label="Signup steps">
          <span className="signup-step is-active">1. Choose plan</span>
          <span className="signup-step">2. Create login</span>
          <span className="signup-step">3. Pay</span>
        </div>

        <div className="section-eyebrow">Choose your plan</div>
        <div className="signup-plan-grid">
          {(["starter", "pro"] as PlanId[]).map((planId) => {
            const entry = PLANS[planId];
            const isSelected = planId === plan;
            const planPill = planId === "pro" ? "Most popular" : "Solo";

            return (
              <label className={`plan-card signup-plan-card ${isSelected ? "selected" : ""}`} key={planId}>
                <input
                  checked={isSelected}
                  name="plan"
                  onChange={() => setPlan(planId)}
                  type="radio"
                  value={planId}
                />
                <span className={`plan-pill ${planId === "pro" ? "plan-pill--featured" : ""}`}>{planPill}</span>
                <span className="plan-card__title-row">
                  <strong>{entry.name}</strong>
                </span>
                <span className="plan-price signup-price">
                  <span className="plan-price__amount">{entry.priceHeadline}</span>
                  <span className="plan-price__unit">{entry.priceSuffix}</span>
                </span>
                <span className="plan-card__copy">{entry.description}</span>
                <span className="signup-plan-note">
                  {entry.supportsEvents
                    ? "Includes your contact page plus linked event pages."
                    : "Includes one live contact page behind your main QR."}
                </span>
              </label>
            );
          })}
        </div>
        <p className="micro-copy">Secure payment happens on the next screen through Stripe Checkout.</p>
      </section>

      <section className="panel signup-panel">
        <div className="panel-header">
          <div>
            <div className="section-eyebrow">Create your account</div>
            <h2>Finish this in one step.</h2>
          </div>
          <span className="signup-plan-badge">{selectedPlan.name}</span>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="sub-grid">
            <label>
              Full name
              <input
                autoComplete="name"
                onChange={(event) => updateField("fullName", event.target.value)}
                required
                type="text"
                value={form.fullName}
              />
            </label>

            <label>
              Company name
              <input
                autoComplete="organization"
                onChange={(event) => updateField("companyName", event.target.value)}
                placeholder="Optional"
                type="text"
                value={form.companyName}
              />
            </label>
          </div>

          <div className="sub-grid">
            <label>
              Work email
              <input
                autoComplete="email"
                onChange={(event) => updateField("email", event.target.value)}
                required
                type="email"
                value={form.email}
              />
            </label>

            <label>
              Password
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => updateField("password", event.target.value)}
                required
                type="password"
                value={form.password}
              />
            </label>
          </div>

          <button className="primary-button full-width" disabled={isPending || !canSubmit} type="submit">
            {isPending ? "Starting checkout..." : `Create login and continue with ${selectedPlan.name}`}
          </button>
        </form>

        {!canSubmit ? (
          <p className="status-message">
            Add your Supabase and Stripe keys in `.env`, then run the app again to use live signup and checkout.
          </p>
        ) : null}
        {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
        {infoMessage ? <p className="status-message">{infoMessage}</p> : null}

        <div className="signup-inline-note">
          <strong>What happens next</strong>
          <span>Your login is created first. Payment activates dashboard access, publishing, and your live QR.</span>
        </div>

        <div className="signup-links">
          <p className="micro-copy">
            Already paid? <Link href="/signin">Sign in</Link>.
          </p>
          <p className="micro-copy">
            Already created a login but still need to pay? <Link href="/signin">Resume checkout</Link>.
          </p>
          <p className="micro-copy">
            Need rollout help for a larger organization? <Link href="/enterprise">Contact sales</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
