import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Clock } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { MediaPlaceholder } from "@/components/cards/media-placeholder";
import type { GuideCard as GuideCardData } from "@/lib/queries/guides";
import { cn } from "@/lib/utils";

/**
 * A guide, as a page rather than a product.
 *
 * This used to share a wrapper string character for character with the business
 * and package cards — same radius, same border, same fill, same hover shadow,
 * differing only in aspect ratio and padding. Three different kinds of thing
 * wearing one costume, so a grid of them read as inventory whatever it held.
 *
 * The strongest and cheapest way to make an article look like an article is to
 * take the chrome away. No border, no card fill, no shadow: a rule, a thumbnail
 * and type. It is the only one of the four that is not a box, which is exactly
 * why it is legible as something else at a glance.
 */
export async function GuideCard({
  guide,
  className,
}: {
  guide: GuideCardData;
  className?: string;
}) {
  const t = await getTranslations("common");
  const tCard = await getTranslations("card");

  return (
    // Savanna Modern: the same card as operators and packages (24px corners,
    // photograph to the edge, text below), where it was a hairline rule over a
    // loose photo and text.
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1.5rem] border bg-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {guide.coverImageUrl ? (
          <Image
            src={guide.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={60}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MediaPlaceholder seed={guide.slug} className="size-full" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:px-[1.125rem]">
        <h3 className="font-display text-lg font-extrabold leading-snug tracking-[-0.01em]">
          <Link
            href={{ pathname: "/guides/[slug]", params: { slug: guide.slug } }}
            className="after:absolute after:inset-0 hover:text-primary"
          >
            {guide.title}
          </Link>
        </h3>

        {/* Two lines, not three. The brief asks for a two-line excerpt and it
          is right: a card is a decision about whether to read, and the third
          line is the one that turns a grid of guides into a wall of prose. */}
        {guide.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {guide.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
          {guide.readingMinutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              {tCard("readingMinutes", { minutes: guide.readingMinutes })}
            </span>
          )}
          {guide.isDemo && <Badge variant="demo">{t("demoData")}</Badge>}
        </div>
      </div>
    </article>
  );
}
