import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------
   Two card shapes appear in the Figma:
   - "edit"  → cover + title + outlined Edit CTA. For modules
               the user owns and is still editing.
   - "stats" → cover + title + 4 KPI lines (no CTA). For
               published modules where progress is what matters.

   Modeled as a discriminated union so the wrong props can't be
   combined (e.g. passing `stats` to an edit-mode card).
--------------------------------------------------------------- */

type Category = "Securities" | "AML" | "DeFi" | "KYC";

type ModuleStats = {
  enrolled: number;
  completed: number;
  available: number;
  avgScore: string; // pre-formatted, e.g. "92%"
};

type EditVariant = {
  mode: "edit";
};

type StatsVariant = {
  mode: "stats";
  stats: ModuleStats;
  shareToken: string;
};

export type ModuleCardData = {
  slug: string;
  title: string;
  category: Category;
  /**
   * Optional cover image URL. When omitted, a CSS gradient is used
   * (matches the cyan→teal gradient in the Figma without relying on
   * the Figma asset, whose URL expires).
   */
  coverImageUrl?: string;
} & (EditVariant | StatsVariant);

/* ---------------------------------------------------------------
   Component
--------------------------------------------------------------- */

export function ModuleItem(props: ModuleCardData) {
  const { slug, title, category, coverImageUrl } = props;
  const [shareOpen, setShareOpen] = useState(false);
  const companySlug = useCompanySlug();

  const moduleHref = companySlug
    ? `/${companySlug}/module/${slug}`
    : "/modules";
  const moduleEditHref = companySlug
    ? `/${companySlug}/module/${slug}/edit`
    : "/modules";

  const shareUrl = useMemo(() => {
    if (props.mode !== "stats") return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/m/${props.shareToken}/join`;
  }, [props]);

  async function copyShareLink(text: string) {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      // fall through to legacy copy
    }

    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // ignore
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-md">
      {/* Cover */}
      <Link
        href={moduleHref}
        className="relative h-[188px] block"
        style={
          coverImageUrl
            ? {
                backgroundImage: `url(${coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                backgroundImage:
                  "linear-gradient(119deg, #68bbfc 6.7%, #5bd3f1 90.6%)",
              }
        }
      >
        <span className="absolute left-2.5 top-2.5 inline-flex items-center justify-center rounded-[14px] bg-background px-2.5 text-[10px] font-medium leading-6 text-ink-subtle">
          {category}
        </span>
        <button
          type="button"
          aria-label="More options"
          className="absolute right-2.5 top-2.5 inline-flex size-6 items-center justify-center rounded-[14px] bg-background text-ink-subtle transition-colors hover:bg-accent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="size-5" strokeWidth={2} />
        </button>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3.5 px-3 py-4">
        <Link href={moduleHref} className="hover:underline">
          <h3 className="text-sm font-semibold leading-6">{title}</h3>
        </Link>

        {props.mode === "edit" ? (
          <Button
            variant="outline"
            nativeButton={false}
            className="border-[#4b27c8] text-[#4b27c8] hover:bg-[#4b27c8]/5 hover:text-[#4b27c8]"
            render={<Link href={moduleEditHref}>Edit</Link>}
          />
        ) : (
          <StatsGrid stats={props.stats} />
        )}
        <div className="flex items-center w-full justify-end gap-2">
          {props.mode === "stats" ? (
            <>
              <Button
                variant="outline"
                size={"lg"}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareOpen(true);
                }}
              >
                Share
              </Button>
              <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share invite link</DialogTitle>
                    <DialogDescription>
                      Anyone with this link can join and sign up for this
                      module.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
                      {shareUrl ?? `/m/${props.shareToken}/join`}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setShareOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          copyShareLink(
                            shareUrl ?? `/m/${props.shareToken}/join`,
                          )
                        }
                      >
                        Copy link
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------
   StatsGrid — 2x2 row of KPI lines
--------------------------------------------------------------- */

function StatsGrid({ stats }: { stats: ModuleStats }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Enrolled:", stats.enrolled],
    ["Completed:", stats.completed],
    ["Available:", stats.available],
    ["AVG score:", stats.avgScore],
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm leading-6 text-ink-subtle">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className={cn(
            // Right-align the second column so the "Completed" / "AVG score"
            // values hang on the right edge like the Figma.
            "flex items-baseline gap-1.5",
            "even:justify-self-end",
          )}
        >
          <dt className="font-normal">{label}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
