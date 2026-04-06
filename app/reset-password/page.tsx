import Link from "next/link";

import { PublicNav } from "@/components/public-nav";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function ResetPasswordPage() {
  return (
    <>
      <PublicNav />
      <main className="auth-shell page-shell">
        <section className="panel panel--wide">
          <div className="section-eyebrow">Password reset</div>
          <h1 className="page-title">Choose a new password.</h1>
          <p className="lead">
            Open the reset link from your email on this device, then set a new password here.
          </p>
        </section>

        <UpdatePasswordForm />

        <section className="panel">
          <p className="micro-copy">
            Back to sign in? <Link href="/signin">Return to sign in</Link>.
          </p>
        </section>
      </main>
    </>
  );
}
