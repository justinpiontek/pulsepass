import { clsx, type ClassValue } from "clsx";

import { BRAND_NAME, BRAND_SLUG } from "@/lib/brand";
import { getSiteUrl } from "@/lib/env";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function absoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export function normalizeExternalUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function formatDateRange(startsAt?: string | null, endsAt?: string | null, timeZone = "America/Chicago") {
  if (!startsAt) {
    return "Date coming soon";
  }

  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  const date = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(start);

  if (!end) {
    return date;
  }

  const endTime = new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
    timeZone
  }).format(end);

  return `${date} to ${endTime}`;
}

export function escapeIcsValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function toVCard(profile: {
  full_name?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.full_name || ""}`,
    `ORG:${profile.company_name || ""}`,
    `TITLE:${profile.job_title || ""}`,
    profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : "",
    profile.email ? `EMAIL:${profile.email}` : "",
    profile.website ? `URL:${profile.website}` : "",
    "END:VCARD"
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function toCalendarFile(event: {
  title?: string | null;
  summary?: string | null;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}, host?: {
  email?: string | null;
  name?: string | null;
}) {
  const uid = `${slugify(event.title || "event")}-${Date.now()}@${BRAND_SLUG}`;
  const start = event.starts_at ? new Date(event.starts_at) : new Date();
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 60 * 60 * 1000);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dtStart = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dtEnd = end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const hostName = host?.name?.trim();
  const hostEmail = host?.email?.trim();

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND_NAME}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    "STATUS:CONFIRMED",
    `SUMMARY:${escapeIcsValue(event.title || `${BRAND_NAME} event`)}`,
    `DESCRIPTION:${escapeIcsValue(event.summary || "")}`,
    `LOCATION:${escapeIcsValue(event.location || "")}`,
    hostEmail ? `ORGANIZER${hostName ? `;CN=${escapeIcsValue(hostName)}` : ""}:mailto:${hostEmail}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ]
    .filter(Boolean)
    .join("\r\n");
}

function toCalendarTimestamp(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(event: {
  title?: string | null;
  summary?: string | null;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}) {
  const start = event.starts_at ? new Date(event.starts_at) : new Date();
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 60 * 60 * 1000);
  const url = new URL("https://calendar.google.com/calendar/render");

  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title || `${BRAND_NAME} event`);
  url.searchParams.set("dates", `${toCalendarTimestamp(start.toISOString())}/${toCalendarTimestamp(end.toISOString())}`);

  if (event.summary) {
    url.searchParams.set("details", event.summary);
  }

  if (event.location) {
    url.searchParams.set("location", event.location);
  }

  return url.toString();
}
