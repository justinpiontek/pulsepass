"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("Open the reset link from your email to load your recovery session.");
  const [sessionReady, setSessionReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canSubmit = hasSupabasePublicEnv();

  useEffect(() => {
    if (!canSubmit) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      if (data.session) {
        setSessionReady(true);
        setInfoMessage("Enter your new password below.");
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setSessionReady(true);
        setInfoMessage("Enter your new password below.");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [canSubmit]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    startTransition(() => {
      void submitUpdate();
    });
  }

  async function submitUpdate() {
    try {
      if (password.length < 8) {
        throw new Error("Use at least 8 characters for your new password.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      router.push("/signin?password=updated");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We could not update your password.");
    }
  }

  return (
    <section className="panel auth-panel">
      <div className="section-eyebrow">Set new password</div>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label>
          Confirm password
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        <button className="primary-button full-width" disabled={isPending || !canSubmit || !sessionReady} type="submit">
          {isPending ? "Updating password..." : "Save new password"}
        </button>
      </form>
      <p className="micro-copy">
        {sessionReady ? "Your recovery session is ready." : "The button turns on after the recovery link opens here."}
      </p>
      {infoMessage ? <p className="status-message">{infoMessage}</p> : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
    </section>
  );
}
