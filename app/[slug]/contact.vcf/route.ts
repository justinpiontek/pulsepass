import { NextResponse } from "next/server";

import { getPublicProfileBySlug } from "@/lib/data";
import { hasSupabasePublicEnv } from "@/lib/env";
import { toVCard } from "@/lib/utils";

type ContactVcfRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: ContactVcfRouteProps) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: "Contact export is not configured." }, { status: 404 });
  }

  const { slug } = await params;
  const data = await getPublicProfileBySlug(slug);

  if (!data) {
    return NextResponse.json({ error: "Published contact page not found." }, { status: 404 });
  }

  const { profile } = data;
  const vcard = toVCard({
    full_name: profile.full_name,
    company_name: profile.company_name,
    job_title: profile.job_title,
    phone: profile.phone,
    email: profile.email,
    website: profile.website
  });

  return new NextResponse(vcard, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `inline; filename="${profile.slug}.vcf"`,
      "content-type": "text/vcard; charset=utf-8",
      "x-content-type-options": "nosniff"
    }
  });
}
