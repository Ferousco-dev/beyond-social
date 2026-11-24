"use client";

import { Check, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useMemo, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import type { LibraryAsset, LibraryGroup } from "@/features/asset-library/types";
import { clearDraft } from "@/features/generate-form/draft";
import { useLibrary } from "@/features/asset-library/use-library";
import { cn } from "@/lib/utils";

import { OWN_IDEA_KEY, type OwnIdea } from "./own-idea-panel";

export const AVATAR_PACK_KEY = "bs:avatar-pack";

/** The person chosen here, handed to Configure video so the AI fill keeps them. */
export interface ChosenPerson {
  face: string;
  voice?: string;
  /** Their label, so the script is written for this person. */
  name: string;
}

interface Person {
  readonly face: LibraryAsset;
  readonly voice: LibraryAsset | null;
  readonly group: string | null;
}

/** Everyone the person may put in a video: each consented face, with a consented voice from the same group when there is one. */
function peopleFrom(assets: readonly LibraryAsset[], groups: readonly LibraryGroup[]): Person[] {
  const names = new Map(groups.map((group) => [group.id, group.name]));
  return assets
    .filter((asset) => asset.kind === "face" && asset.consent_at !== null)
    .map((face) => ({
      face,
      voice: face.group_id ? (assets.find((a) => a.kind === "voice" && a.consent_at !== null && a.group_id === face.group_id) ?? null) : null,
      group: face.group_id ? (names.get(face.group_id) ?? null) : null,
    }));
}

/**
 * Starts a video with a saved person: pick them, say what the video is about,
 * and our AI fills in the rest around them.
 */
export function AvatarPackPanel() {
  const router = useRouter();
  // The shared library read, started when New Video opened, so people show at once.
  const library = useLibrary();
  const people = useMemo<readonly Person[] | null>(
    () => (library.status === "ready" ? peopleFrom(library.assets, library.groups) : library.status === "error" ? [] : null),
    [library],
  );
  const [picked, setPicked] = useState<Person | null>(null);
  // With only one saved person, they are already chosen.
  const chosen = picked ?? (people?.length === 1 ? (people[0] ?? null) : null);
  const [idea, setIdea] = useState("");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start(): void {
    if (!chosen || idea.trim() === "" || opening) return;
    setOpening(true);
    try {
      clearDraft();
      for (const key of ["bs:generate-draft", "bs:approved-script", "bs:quick-start"]) window.sessionStorage.removeItem(key);
      const person: ChosenPerson = { face: chosen.face.id, name: chosen.group ?? chosen.face.label, ...(chosen.voice ? { voice: chosen.voice.id } : {}) };
      const own: OwnIdea = { objective: idea.trim() };
      window.sessionStorage.setItem(AVATAR_PACK_KEY, JSON.stringify(person));
      window.sessionStorage.setItem(OWN_IDEA_KEY, JSON.stringify(own));
    } catch {
      setOpening(false);
      setError("This browser could not save your choice. Check its storage settings and try again.");
      return;
    }
    router.push("/dashboard/videos/new" as Route);
  }

  if (people === null) return <p className="text-sm text-ink-soft">Loading your saved people…</p>;

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-ink">Nobody saved yet. Add a photo of someone in Assets and confirm their consent.</p>
        <Link
          href={"/dashboard/assets" as Route}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Add a person in Assets
        </Link>
        {library.status === "error" ? <p role="alert" className="text-sm text-destructive">{library.message}</p> : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
      className="flex flex-col gap-5"
    >
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4" aria-label="Saved people">
        {people.map((person) => {
          const selected = chosen?.face.id === person.face.id;
          return (
            <li key={person.face.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setPicked(person)}
                className="group flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl p-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  className={cn(
                    "relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-cloud ring-2 transition",
                    selected ? "ring-primary" : "ring-hairline group-hover:ring-ink/30",
                  )}
                >
                  {person.face.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.face.url} alt="" onError={(event) => (event.currentTarget.style.display = "none")} className="size-full object-cover" />
                  ) : (
                    <UserRound className="size-9 text-ink-soft" aria-hidden />
                  )}
                  {selected ? (
                    <span className="absolute bottom-0 right-0 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-paper">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span className="w-full truncate text-sm font-medium text-ink">{person.group ?? person.face.label}</span>
                {person.voice ? <span className="-mt-1.5 text-[11px] text-ink-soft">With their voice</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      {chosen ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          What is the video about?
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                start();
              }
            }}
            maxLength={500}
            rows={3}
            autoFocus
            placeholder={`e.g. ${chosen.group ?? chosen.face.label} showing my new glow serum, upbeat, ends with shop now`}
            className="field-sizing-content min-h-20 w-full resize-none rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm font-normal leading-6 text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={!chosen || idea.trim() === "" || opening}
          aria-busy={opening}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {opening ? <Spinner className="size-4" /> : null}
          {opening ? "Opening" : "Continue"}
        </button>
        <Link href={"/dashboard/assets" as Route} className="text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline">
          Add another person
        </Link>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
