import { cn } from '@/lib/utils';

/**
 * Brand mark — an acacia silhouette against the savanna sun.
 *
 * Drawn rather than photographed so it stays crisp at favicon size and can invert
 * cleanly onto hero photography. The canopy is a single swept path; the branches
 * fan from one trunk node so the whole mark reads at 20px.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('size-8', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="et-sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.15 65)" />
          <stop offset="55%" stopColor="oklch(0.60 0.15 45)" />
          <stop offset="100%" stopColor="oklch(0.52 0.11 200)" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="9" fill="url(#et-sun)" />

      {/* Sun disc, low on the horizon */}
      <circle cx="16" cy="19.5" r="6.2" fill="oklch(0.97 0.05 80)" opacity="0.32" />

      {/* Acacia — flat-topped canopy, the Serengeti signature */}
      <path
        d="M5.6 13.1c2.1-3.6 6-5.5 10.4-5.5s8.3 1.9 10.4 5.5c-2.4-1.5-5.4-2.3-8.6-2.4l-.1 1.2c2.6.2 5 .9 7 2-2.6-.6-5.5-.8-8.6-.6v.9c-2.6-.1-5-.4-7.1-1 1.9-.9 4.1-1.5 6.5-1.7l-.1-1.2c-3.5.2-6.7 1-9.8 2.8Z"
        fill="white"
        fillOpacity="0.96"
      />
      {/* Trunk with a low fork */}
      <path
        d="M15.4 12.8h1.3v11.9h-1.3z"
        fill="white"
        fillOpacity="0.96"
      />
      <path
        d="M16 18.4l-3.4 3.1.9 1 2.5-2.3 2.5 2.3.9-1z"
        fill="white"
        fillOpacity="0.96"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {showWordmark && (
        <span className="font-display text-lg font-semibold leading-none tracking-tight">
          Explore<span className="text-primary">Tanzania</span>
        </span>
      )}
    </span>
  );
}
