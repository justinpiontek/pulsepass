import Link from "next/link";
import { redirect } from "next/navigation";

import { BRAND_NAME } from "@/lib/brand";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PublicNav() {
  let user = null;

  if (hasSupabasePublicEnv()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  async function signOutAction() {
    "use server";

    if (!hasSupabasePublicEnv()) {
      redirect("/");
    }

    const authClient = await createSupabaseServerClient();
    await authClient.auth.signOut();
    redirect("/");
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/">
          {BRAND_NAME}
        </Link>
        <nav className="site-nav">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/enterprise">Enterprise</Link>
        </nav>
        <div className="site-actions">
          {user ? (
            <>
              <Link className="ghost-button" href="/dashboard">
                Dashboard
              </Link>
              <form action={signOutAction}>
                <button className="ghost-button" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="ghost-button" href="/signin">
                Member sign in
              </Link>
              <Link className="primary-button" href="/signup">
                Start paid account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
