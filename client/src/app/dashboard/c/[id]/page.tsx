import { type Metadata } from "next";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";
import { type PickerAsset } from "@/features/workspace/components/asset-picker";
import { DEMO_TAKES, demoPickerAssets, demoProject } from "@/features/workspace/lib/demo";
import { getBrandLibrary } from "@/lib/assets/brand";
import { getThread } from "@/lib/chat/thread";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { getEditorDocument } from "@/lib/editor/document";

export const metadata: Metadata = { title: "Project" };
// The thread is per-user and changes on every turn, so it is never cached.
export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  // ?demo=1 fills the canvas, takes, and picker with sample clips so the whole
  // layout reads as finished. Real data always wins when it exists.
  const demo = (await searchParams)?.demo === "1";
  /*
   * The saved likeness rides along so a voice clip on its own can still become
   * an avatar. The editor document loads here too: the canvas and the chat now
   * share one screen, so one page load prepares both.
   */
  const [thread, library, document, user] = await Promise.all([
    getThread(id),
    getBrandLibrary(),
    getEditorDocument(id),
    getCurrentUser(),
  ]);
  const avatar = library.avatar;

  const pickerAssets: PickerAsset[] = demo
    ? demoPickerAssets()
    : [
        ...(avatar?.url
          ? [{ id: avatar.id, label: avatar.label || "Avatar", url: avatar.url, kind: "avatar" }]
          : []),
        ...library.products.map((asset) => ({
          id: asset.id,
          label: asset.label || "Product",
          url: asset.url,
          kind: "image" as const,
        })),
        ...thread.messages.flatMap((message) =>
          message.draft?.resultUrl
            ? [
                {
                  id: message.draft.generationId,
                  label: message.content.slice(0, 48) || "Take",
                  url: message.draft.resultUrl,
                  kind: "video" as const,
                },
              ]
            : [],
        ),
      ];

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <WorkspaceShell
      thread={thread}
      savedLikeness={avatar?.url ? { path: avatar.path, url: avatar.url } : null}
      initialProject={demo ? demoProject() : document.project}
      initialRevision={document.revision}
      // A project that does not exist has nothing to attach a document to, so
      // autosave stays off rather than failing on every keystroke.
      canSave={thread.projectId !== null}
      conversationId={id}
      userName={firstName}
      pickerAssets={pickerAssets}
      demoTakes={demo ? DEMO_TAKES : []}
    />
  );
}
