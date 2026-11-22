/**
 * Classmates, shown the way each band's page asks (docs/EXPERIENCE_DESIGN_BRIEF.md G1, I5). A classmate is a name,
 * an avatar and points, from the board the home already read; ranks and ties are the server's. Nobody is shown as
 * last or behind in front of others, and the youngest bands see no rank number below the podium:
 *   early   one line: "Our class has N stars" (the class total, no names)
 *   young   the podium of three, and "You: N points"
 *   junior  the podium, then the child with the one above and the one below; in last place only the one above, and
 *           the line speaks of their own gain this week
 *   teen    the full table
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bi } from "@/components/student/band/Bi";
import { CARD, CARD_TITLE } from "@/components/student/nova/ivory";
import { getAvatarUrl } from "@/lib/avatars";
import { givenName } from "@/lib/givenName";
import { cn } from "@/lib/utils";
import type { Classmate, useClassmates } from "./useClassmates";
import type { AgeBand } from "@/lib/ageBand";

type ClassData = ReturnType<typeof useClassmates>;

function Face({ c, size = "h-12 w-12" }: { c: Classmate; size?: string }) {
  return (
    <Avatar className={cn(size, "border border-hec-line")}>
      <AvatarImage src={getAvatarUrl(c.avatarUrl) || undefined} alt="" />
      <AvatarFallback className="bg-hec-sunken text-hec-ink">{givenName(c.name).slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function Podium({ top }: { top: Classmate[] }) {
  // the order a podium is drawn: second, first, third
  const order = [top[1], top[0], top[2]].filter(Boolean) as Classmate[];
  const height = (c: Classmate) => (c === top[0] ? "h-24" : c === top[1] ? "h-16" : "h-12");
  return (
    <ol className="flex items-end justify-center gap-3" aria-label="Top three">
      {order.map((c) => (
        <li key={c.id} className="flex w-24 min-w-0 flex-col items-center gap-1 text-center">
          <Face c={c} />
          <span className="w-full whitespace-normal break-words text-hec-small font-medium text-hec-ink">{givenName(c.name)}</span>
          <span
            className={cn(
              "flex w-full items-start justify-center rounded-t-hec-md border border-hec-line bg-hec-sunken pt-2 text-hec-small font-semibold tabular-nums text-hec-ink",
              height(c),
            )}
          >
            {c.points}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Classmates({ band, data, heading }: { band: AgeBand; data: ClassData; heading?: string }) {
  // If the board has not loaded or could not be read, nothing is guessed: the block is left out.
  if (data.loading || !data.ready || data.ranked.length === 0) return null;
  const { ranked, self } = data;

  if (band === "early") {
    return (
      <section className={cn(CARD, "text-center")}>
        {heading && <p className="mb-1 text-hec-small text-hec-ink-soft">{heading}</p>}
        <p className="font-display text-hec-h2 font-bold tabular-nums text-hec-ink">
          <Bi k="class.stars" vars={{ n: data.classTotal }} />
        </p>
      </section>
    );
  }

  if (band === "young") {
    return (
      <section aria-labelledby="class-title" className={cn(CARD, "space-y-4")}>
        <h2 id="class-title" className={CARD_TITLE}>
          {heading ?? <Bi k="class.title" />}
        </h2>
        <Podium top={data.podium} />
        {self && (
          <p className="text-center text-hec-body font-medium tabular-nums text-hec-ink">
            <Bi k="class.you" vars={{ n: self.points }} />
          </p>
        )}
      </section>
    );
  }

  if (band === "junior") {
    const at = self ? ranked.findIndex((r) => r.id === self.id) : -1;
    const above = at > 0 ? ranked[at - 1] : null;
    const below = at >= 0 && at < ranked.length - 1 ? ranked[at + 1] : null;
    const last = at >= 0 && at === ranked.length - 1 && ranked.length > 1;
    const near = [above, self, below].filter(Boolean) as Classmate[];
    return (
      <section aria-labelledby="class-title" className={cn(CARD, "space-y-4")}>
        <h2 id="class-title" className={CARD_TITLE}>
          {heading ?? <Bi k="class.title" />}
        </h2>
        <Podium top={data.podium} />
        {self && (
          <div className="space-y-2">
            <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
              <Bi k="class.near" />
            </p>
            <ul className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
              {near.map((c) => (
                <li key={c.id} className={cn("flex min-h-hec-target items-center gap-3 px-3 py-2", c.isSelf && "bg-hec-sunken")}>
                  <Face c={c} size="h-9 w-9" />
                  <span className="min-w-0 flex-1 whitespace-normal break-words text-hec-small font-medium text-hec-ink">{givenName(c.name)}</span>
                  <span className="shrink-0 text-hec-small tabular-nums text-hec-ink-soft">
                    <Bi k="class.points" vars={{ n: c.points }} />
                  </span>
                </li>
              ))}
            </ul>
            {last && typeof self.gainWeek === "number" && self.gainWeek > 0 && (
              <p className="text-hec-small text-hec-ink">
                <Bi k="class.gain" vars={{ n: self.gainWeek }} />
              </p>
            )}
          </div>
        )}
      </section>
    );
  }

  // teen: the whole table
  return (
    <section aria-labelledby="class-title" className={cn(CARD, "space-y-3")}>
      <h2 id="class-title" className={CARD_TITLE}>
        <Bi k="class.table" />
      </h2>
      <ol className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
        {ranked.map((c) => (
          <li key={c.id} className={cn("flex min-h-hec-target items-center gap-3 px-3 py-2", c.isSelf && "bg-hec-sunken")}>
            <span className="w-6 shrink-0 text-hec-small tabular-nums text-hec-ink-soft">{c.rank}</span>
            <Face c={c} size="h-8 w-8" />
            <span className="min-w-0 flex-1 whitespace-normal break-words text-hec-small font-medium text-hec-ink">{c.name}</span>
            <span className="shrink-0 text-hec-small tabular-nums text-hec-ink-soft">{c.points}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
