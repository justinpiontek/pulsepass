"use client";

type SaveContactLinkProps = {
  href: string;
  label: string;
};

function isLikelyIos() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function SaveContactLink({ href, label }: SaveContactLinkProps) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isLikelyIos()) {
      return;
    }

    event.preventDefault();

    const opened = window.open(href, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = href;
    }
  }

  return (
    <a className="primary-button public-action-primary" href={href} onClick={handleClick} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  );
}
