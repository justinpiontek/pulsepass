"use client";

import { useState } from "react";

type EmailActionLinkProps = {
  email: string;
  label?: string;
};

function isLikelyIos() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

export function EmailActionLink({ email, label = "Email" }: EmailActionLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const mailtoHref = `mailto:${email}`;

  function handleActivate(event: React.MouseEvent<HTMLButtonElement>) {
    if (!isLikelyIos()) {
      window.location.href = mailtoHref;
      return;
    }

    event.preventDefault();
    setIsOpen(true);
    setCopied(false);
  }

  async function handleCopy() {
    await copyText(email);
    setCopied(true);
  }

  function handleOpenMail() {
    window.location.href = mailtoHref;
  }

  return (
    <>
      <button className="ghost-button public-action-secondary" onClick={handleActivate} type="button">
        {label}
      </button>

      {isOpen ? (
        <div className="public-sheet-backdrop" onClick={() => setIsOpen(false)} role="presentation">
          <div
            aria-label="Email options"
            aria-modal="true"
            className="public-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="public-sheet__eyebrow">Email options</div>
            <strong className="public-sheet__title">{email}</strong>
            <p className="micro-copy public-sheet__copy">
              Your phone chooses which mail app opens. If you would rather avoid that, copy the email instead.
            </p>
            <div className="public-sheet__actions">
              <button className="primary-button full-width" onClick={handleCopy} type="button">
                {copied ? "Copied" : "Copy email"}
              </button>
              <button className="ghost-button full-width" onClick={handleOpenMail} type="button">
                Open email app
              </button>
              <button className="ghost-button full-width" onClick={() => setIsOpen(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
