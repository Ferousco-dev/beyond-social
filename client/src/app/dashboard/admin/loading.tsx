import { Bone } from "../_skeleton";

/**
 * Shown the moment an admin section is clicked, while its figures load: the
 * heading, a row of tiles and a panel, in the shapes most admin pages use.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-busy>
      <span className="sr-only">Loading</span>
      <Bone className="h-6 w-36 rounded-md" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="rounded-xl border border-hairline bg-paper p-3.5">
            <Bone className="size-7 rounded-md" />
            <Bone className="mt-3 h-5 w-12" />
            <Bone className="mt-2 h-3 w-20 bg-cloud/70" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-paper">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
            <Bone className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-40" />
              <Bone className="h-3 w-28 bg-cloud/70" />
            </div>
            <Bone className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
