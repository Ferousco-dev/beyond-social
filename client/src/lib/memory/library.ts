import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

/**
 * Everything the product has remembered about someone, for them to read.
 *
 * Memory that cannot be inspected is memory that cannot be corrected, and a
 * wrong claim here quietly changes every video from now on. It is also the
 * hardest kind of bug to report: the user has no way to know the reason their
 * videos went vertical is a sentence recorded three weeks ago.
 *
 * Retired claims are included rather than hidden. "You used to prefer X" is the
 * part that explains a change in behaviour, and it is the first thing somebody
 * looks for when the product starts doing something new.
 */

export interface RememberedFact {
  readonly id: string;
  readonly fact: string;
  readonly kind: string;
  readonly importance: number;
  readonly createdAt: string;
  /** Null while the claim still counts. Set when a later one replaced it. */
  readonly supersededAt: string | null;
  /** How many times it has actually been used to answer something. */
  readonly useCount: number;
}

const rowSchema = z.object({
  id: z.string(),
  fact: z.string(),
  kind: z.string(),
  importance: z.coerce.number(),
  created_at: z.string(),
  superseded_at: z.string().nullable().default(null),
  use_count: z.coerce.number().default(0),
});

export interface MemoryLibrary {
  readonly live: readonly RememberedFact[];
  readonly retired: readonly RememberedFact[];
}

const EMPTY: MemoryLibrary = { live: [], retired: [] };

export async function getMemoryLibrary(): Promise<MemoryLibrary> {
  if (!isSupabaseConfigured) return EMPTY;

  const user = await getAuthUser();
  if (!user) return EMPTY;

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_memories")
    .select("id, fact, kind, importance, created_at, superseded_at, use_count")
    .order("created_at", { ascending: false })
    .limit(200);

  const parsed = z.array(rowSchema).safeParse(data ?? []);
  if (!parsed.success) return EMPTY;

  const facts: RememberedFact[] = parsed.data.map((row) => ({
    id: row.id,
    fact: row.fact,
    kind: row.kind,
    importance: row.importance,
    createdAt: row.created_at,
    supersededAt: row.superseded_at,
    useCount: row.use_count,
  }));

  return {
    live: facts.filter((fact) => fact.supersededAt === null),
    retired: facts.filter((fact) => fact.supersededAt !== null),
  };
}
