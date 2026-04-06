import { NextResponse } from "next/server";

import { getPublishedEventBySlugs } from "@/lib/data";
import { hasSupabasePublicEnv } from "@/lib/env";
import { toCalendarFile } from "@/lib/utils";

type CalendarFileRouteContext = {
  params: Promise<{
    eventSlug: string;
    slug: string;
  }>;
};

export async function GET(_request: Request, context: CalendarFileRouteContext) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: "Calendar export is not configured." }, { status: 404 });
  }

  const { slug, eventSlug } = await context.params;
  const data = await getPublishedEventBySlugs(slug, eventSlug);

  if (!data) {
    return NextResponse.json({ error: "Published event not found." }, { status: 404 });
  }

  const ics = toCalendarFile(data.event, {
    email: data.profile.email,
    name: data.profile.full_name || data.profile.company_name
  });

  return new NextResponse(ics, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${data.event.slug}.ics"`,
      "content-type": "text/calendar; charset=utf-8; method=PUBLISH"
    }
  });
}
