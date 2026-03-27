import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initialsFromAddress(address: string): string {
  const local = address.split("@")[0]?.trim() ?? address;
  const alphanumeric = local.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const parts = alphanumeric.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    return `${a}${b}`.toUpperCase();
  }
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  return (local[0] ?? "?").toUpperCase();
}

export const MailboxAvatar = memo(function MailboxAvatar({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  const { initials, gradient } = useMemo(() => {
    const initials = initialsFromAddress(address);
    const h = hashString(address) % 360;
    const h2 = (h + 48) % 360;
    const gradient = `linear-gradient(135deg, hsl(${h} 62% 42%), hsl(${h2} 68% 32%))`;
    return { initials, gradient };
  }, [address]);

  return (
    <div
      role="img"
      aria-label={`Mailbox avatar for ${address}`}
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-tight text-white shadow-md ring-2 ring-zinc-600/60",
        className
      )}
      style={{ background: gradient }}
    >
      {initials}
    </div>
  );
});
