import { cn } from '@/lib/utils';

/**
 * The WhatsApp mark — design.md §4.
 *
 * "WhatsApp uses the official glyph as a single inline SVG component,
 * aria-hidden, beside the visible text 'WhatsApp'."
 *
 * One component, because the app reaches WhatsApp from nine places and each was
 * drawing lucide's `message-circle` — a generic speech bubble that says "chat",
 * not "the app on your phone that these operators actually answer on". On a
 * site where WhatsApp is the main reply channel, that distinction is the
 * difference between a button people recognise and one they read.
 *
 * `aria-hidden` without exception: the visible text or the button's own
 * `aria-label` carries the name, and a logo announced as "WhatsApp" next to the
 * word WhatsApp says it twice.
 *
 * `currentColor`, not brand green. White on #25D366 is 1.98:1, which fails at
 * any size, so the fill comes from the button (§3.1 routes it to success-700).
 */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('size-5', className)}
    >
      <path d="M12.04 2.004c-5.495 0-9.96 4.465-9.962 9.957a9.9 9.9 0 0 0 1.33 4.977L2 22.01l5.2-1.363a9.93 9.93 0 0 0 4.836 1.232h.004c5.49 0 9.957-4.466 9.959-9.958a9.9 9.9 0 0 0-2.914-7.045 9.88 9.88 0 0 0-7.045-2.872Zm0 1.68a8.23 8.23 0 0 1 5.857 2.427 8.25 8.25 0 0 1 2.424 5.854c-.002 4.566-3.717 8.28-8.283 8.28h-.003a8.26 8.26 0 0 1-4.207-1.152l-.302-.18-3.086.81.824-3.012-.196-.313a8.22 8.22 0 0 1-1.26-4.395c.002-4.564 3.717-8.278 8.282-8.278Z" />
      <path d="M9.5 7.17c-.185-.412-.38-.42-.556-.428l-.474-.005a.91.91 0 0 0-.66.31c-.227.248-.866.846-.866 2.062 0 1.217.886 2.392 1.009 2.558.123.165 1.71 2.74 4.218 3.73 2.084.823 2.38.66 2.809.62.428-.04 1.38-.565 1.575-1.11.196-.547.196-1.016.137-1.114-.058-.099-.216-.158-.45-.275-.236-.117-1.38-.68-1.595-.758-.216-.078-.372-.117-.529.118-.156.235-.608.782-.745.94-.138.157-.275.177-.51.06-.236-.118-.996-.368-1.897-1.172-.701-.625-1.172-1.397-1.31-1.632-.137-.235-.014-.364.104-.48.104-.104.275-.27.412-.407.137-.137.182-.235.274-.391.092-.157.046-.294-.013-.411-.059-.118-.51-1.232-.7-1.685Z" />
    </svg>
  );
}
