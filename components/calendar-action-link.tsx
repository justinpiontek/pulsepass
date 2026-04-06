"use client";

import { useEffect, useState } from "react";

type CalendarActionLinkProps = {
  className?: string;
  googleCalendarUrl: string;
  icsUrl: string;
};

function prefersGoogleCalendar() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes("android");
}

export function CalendarActionLink({ className, googleCalendarUrl, icsUrl }: CalendarActionLinkProps) {
  const [href, setHref] = useState(icsUrl);

  useEffect(() => {
    setHref(prefersGoogleCalendar() ? googleCalendarUrl : icsUrl);
  }, [googleCalendarUrl, icsUrl]);

  return (
    <a className={className} href={href}>
      Add to calendar
    </a>
  );
}
