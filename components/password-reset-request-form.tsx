"use client";

import { useState, useTransition } from "react";

import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PasswordResetRequestFormProps = {
  defaultEmail?: string;
};

export function PasswordResetRequestForm({ defaultEmail = "" }: PasswordResetRequestFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const canSubmit = hasSupabasePublicEnv();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    startTransition(() => {
      void submitRequest();
    });
  }

  async function submitRequest() {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      setInfoMessage("Check your email for a password reset link.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We could not send the reset email.");
    }
  }

  return (
    <section className="panel auth-panel">
      <div className="section-eyebrow">Forgot password?</div>
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
        <button className="ghost-button full-width" disabled={isPending || !canSubmit} type="submit">
          {isPending ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>
      <p className="micro-copy">Use the same email as your paid account or checkout login.</p>
      {infoMessage ? <p className="status-message">{infoMessage}</p> : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
    </section>
  );
}
