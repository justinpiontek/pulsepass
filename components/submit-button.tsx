"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  className?: string;
  disabled?: boolean;
  idleLabel: string;
  pendingLabel?: string;
};

export function SubmitButton({
  className,
  disabled = false,
  idleLabel,
  pendingLabel
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={cn(className, pending ? "is-pending" : "")}
      disabled={disabled || pending}
      type="submit"
    >
      <span className="button-label">{pending ? pendingLabel || idleLabel : idleLabel}</span>
      {pending ? <span aria-hidden="true" className="button-spinner" /> : null}
    </button>
  );
}
