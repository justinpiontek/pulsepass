import { NextResponse } from "next/server";

import { getPublicProfileBySlug } from "@/lib/data";
import { hasGoogleWalletEnv, hasSupabasePublicEnv } from "@/lib/env";
import { absoluteUrl } from "@/lib/utils";
import { createGoogleWalletSaveUrl } from "@/lib/wallet";

type GoogleWalletRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: GoogleWalletRouteContext) {
  if (!hasSupabasePublicEnv() || !hasGoogleWalletEnv()) {
    return NextResponse.json({ error: "Google Wallet is not configured." }, { status: 404 });
  }

  const { slug } = await context.params;
  const data = await getPublicProfileBySlug(slug);

  if (!data) {
    return NextResponse.json({ error: "Published contact page not found." }, { status: 404 });
  }

  const saveUrl = createGoogleWalletSaveUrl({
    contactUrl: absoluteUrl(`/${data.profile.slug}`),
    profile: data.profile
  });

  return NextResponse.redirect(saveUrl);
}
