type LogoProps = {
  className?: string;
  size?: number;
};

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label="Fake Email logo"
      className={className}
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        className="fill-ink"
      />
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        fill="none"
        className="stroke-ink"
        strokeWidth="1"
      />
      <rect
        x="8.5"
        y="13"
        width="23"
        height="15"
        rx="2.5"
        fill="none"
        className="stroke-paper"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 15 L20 22.5 L31 15"
        fill="none"
        className="stroke-paper"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="11" r="3.5" className="fill-vermillion" />
      <circle cx="30" cy="11" r="3.5" className="fill-vermillion opacity-40 animate-dot-pulse" />
    </svg>
  );
}
