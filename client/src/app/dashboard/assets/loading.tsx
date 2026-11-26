import { Bone } from "../_skeleton";

/**
 * The assets page while it loads, drawn as the page now is: the heading, the
 * kind tabs, the two buttons, and a group card with its tiles, so the swap to
 * real content moves nothing.
 */
export default function AssetsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8" aria-busy>
      <span className="sr-only">Loading your assets</span>

      <Bone className="h-8 w-28 rounded-md" />
      <Bone className="mt-3 h-4 w-64 bg-cloud/70" />

      <div className="mt-6 flex gap-4 border-b border-hairline pb-2.5">
        {["w-7", "w-13", "w-12", "w-15", "w-21", "w-11", "w-11"].map((width, index) => (
          <Bone key={index} className={`h-4 ${width}`} />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Bone className="h-9 w-28" />
        <Bone className="h-9 w-28" />
      </div>

      <div className="mt-6 rounded-xl border border-hairline bg-paper p-4">
        <div className="flex items-center justify-between">
          <Bone className="h-4 w-32" />
          <Bone className="h-4 w-14" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {[0, 1, 2].map((tile) => (
            <div key={tile} className="overflow-hidden rounded-xl border border-hairline">
              <Bone className="aspect-[4/5] rounded-none" />
              <div className="space-y-2 p-2.5">
                <Bone className="h-3.5 w-3/4" />
                <Bone className="h-3 w-1/2 bg-cloud/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
