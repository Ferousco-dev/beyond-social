"use client";

import { Check, RefreshCw } from "lucide-react";

import { useBrandLibrary } from "@/features/assets/hooks/use-brand-library";
import { type BrandAsset } from "@/lib/assets/brand";
import { type ScriptSubject } from "@/lib/script/schema";
import { cn } from "@/lib/utils";

import { type AssetBindings } from "../hooks/use-script-draft";

/**
 * The half of the script that belongs to the user.
 *
 * Filled in rather than blank: the writer proposes a subject from the analysis
 * and their industry, and correcting a draft is a much smaller ask than filling
 * six empty boxes. Changing one of these does not rewrite anything on its own,
 * because the lines below may already have been edited by hand; the rewrite is
 * offered and taken deliberately.
 *
 * Speaker and product can also be bound to a saved asset rather than typed.
 * The pipeline has known how to feature a saved photo exactly, not just a
 * description of one, since products were added; a script written for "a
 * founder in her thirties" used to render a generated stranger even when the
 * account's own avatar was sitting in the library the whole time.
 */

const FIELDS: readonly { key: keyof ScriptSubject; label: string; placeholder: string }[] = [
  { key: "topic", label: "Topic", placeholder: "What the video is about" },
  { key: "audience", label: "Audience", placeholder: "Who it is for" },
  { key: "speaker", label: "Speaker", placeholder: "Who is on camera" },
  { key: "product", label: "Product", placeholder: "What you are selling, if anything" },
  { key: "cta", label: "Call to action", placeholder: "What they should do next" },
  { key: "location", label: "Location", placeholder: "Where it is shot" },
];

function AssetChip({
  asset,
  label,
  bound,
  onToggle,
}: {
  asset: BrandAsset;
  label: string;
  bound: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={bound}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        bound
          ? "border-primary bg-primary/10 text-primary"
          : "border-hairline text-ink-soft hover:text-ink",
      )}
    >
      {bound ? <Check className="size-3" aria-hidden /> : null}
      {label || asset.label || "Untitled"}
    </button>
  );
}

export function ScriptSubjectFields({
  subject,
  stale,
  writing,
  bindings,
  onChange,
  onBindSpeaker,
  onBindProduct,
  onRewrite,
}: {
  subject: ScriptSubject;
  stale: boolean;
  writing: boolean;
  bindings: AssetBindings;
  onChange: (field: keyof ScriptSubject, value: string) => void;
  onBindSpeaker: (asset: BrandAsset | null) => void;
  onBindProduct: (asset: BrandAsset | null) => void;
  onRewrite: () => void;
}) {
  const library = useBrandLibrary();

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        What yours is about
      </h3>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink-soft">{field.label}</span>
            <input
              type="text"
              value={subject[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              maxLength={160}
              className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            />

            {field.key === "speaker" && library.library.avatar ? (
              <div className="mt-1.5">
                <AssetChip
                  asset={library.library.avatar}
                  label="Use your saved photo"
                  bound={bindings.speaker !== null}
                  onToggle={() => onBindSpeaker(bindings.speaker ? null : library.library.avatar)}
                />
              </div>
            ) : null}

            {field.key === "product" && library.library.products.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {library.library.products.map((product) => (
                  <AssetChip
                    key={product.id}
                    asset={product}
                    label={product.label}
                    bound={bindings.product?.id === product.id}
                    onToggle={() =>
                      onBindProduct(bindings.product?.id === product.id ? null : product)
                    }
                  />
                ))}
              </div>
            ) : null}
          </label>
        ))}
      </div>

      {bindings.speaker || bindings.product ? (
        <p className="mt-2 text-xs text-ink-soft">
          {[bindings.speaker ? "the speaker" : null, bindings.product ? "the product" : null]
            .filter(Boolean)
            .join(" and ")}{" "}
          will be your actual saved photo, not a generated likeness.
        </p>
      ) : null}

      {stale ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-cloud px-3 py-2.5">
          <p className="min-w-0 flex-1 text-xs text-ink-soft">
            The lines below were written for the old subject.
          </p>
          <button
            type="button"
            onClick={onRewrite}
            disabled={writing}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {writing ? "Rewriting" : "Rewrite the script"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
