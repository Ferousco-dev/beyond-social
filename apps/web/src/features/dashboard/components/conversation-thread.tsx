"use client";

import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { sendMessage } from "@/features/chat/actions";
import { QuestionPrompt } from "@/features/brief/components/question-prompt";
import { Coachmark } from "@/features/tips/components/coachmark";
import { useClarification } from "../hooks/use-clarification";
import { TIPS } from "@/lib/tips/tips";
import { followUpsFor } from "@/lib/generation/follow-ups";
import { recordLikenessConsent, startAvatarGeneration } from "@/features/generation/avatar-actions";
import { AVATAR_REPLY } from "@/features/generation/avatar-copy";
import { CONSENT_STATEMENT } from "@/features/generation/consent";
import { useConfirm } from "@/components/ui/use-confirm";
import { type AttachmentKind, type Thread } from "@/lib/chat/thread";

import { ConversationHeader } from "./conversation-header";
import { PromptComposer } from "./prompt-composer";
import { useComposerDraft } from "../hooks/use-composer-draft";
import { useStreamedTurn } from "../hooks/use-streamed-turn";
import { useThreadMessages } from "../hooks/use-thread-messages";
import { type PendingPhoto } from "./compose-menu";
import { turnAttachments } from "../lib/turn-attachments";
import { ThreadTranscript, type Notice } from "./thread-transcript";

/** Optimistic ids are prefixed so a server id can never collide with one. */

/**
 * What the server persists for an attachment: the object, not a link to it.
 * Mutable because it crosses a server action boundary, and the generated input
 * type for one is not readonly.
 */
type AttachmentRef = { kind: AttachmentKind; path: string };

export function ConversationThread({ thread }: { thread: Thread }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback((text: string, upgrade = false) => setNotice({ text, upgrade }), []);
  const [sending, setSending] = useState(false);

  const { confirm, dialog } = useConfirm();
  const endRef = useRef<HTMLDivElement>(null);

  const projectId = thread.projectId ?? "new";
  const editorHref = `/editor/${projectId}` as Route;

  // What the thread is showing, and the drafts still moving in it.
  const {
    messages,
    setMessages,
    nextId,
    rendering,
    watch,
    cancelDraft,
    regenerate,
    extend,
    regeneratingId,
  } = useThreadMessages(thread, confirm, notify);

  // What is in the composer and not yet sent. Cleared as a whole on send.
  const draft = useComposerDraft(thread.projectId);
  /*
   * The two callbacks `submit` uses, destructured.
   *
   * Depending on `draft` itself would rebuild `submit` on every keystroke,
   * because the hook returns a fresh object each render while the callbacks on
   * it are stable.
   */
  const { clear: clearDraft, setPrompt: setDraftPrompt } = draft;

  /*
   * The turn, read as it happens.
   *
   * `sendMessage` is passed as the fallback rather than replaced by it: a
   * browser or proxy that cannot hold the stream still gets the same result
   * from the same pipeline, just at the end instead of throughout.
   */
  const turn = useStreamedTurn(sendMessage);
  // Destructured because it is what `submit` depends on: the hook's object
  // identity changes every render, the callback on it does not.
  const { send: sendTurn } = turn;

  /*
   * The next moves, offered under the newest finished video only.
   *
   * Under every video in a long thread they would be a row of buttons repeated
   * down the page, and the ones higher up refer to a cut that has already been
   * revised twice. Derived from the brief that produced it, so anything the
   * user already specified is not offered back to them.
   */
  const followUps = useMemo(() => {
    const last = messages.at(-1);
    if (!last?.draft || last.draft.status !== "ready") return [];

    // The brief is the user turn this reply answered, which is the message
    // before it. A thread always opens with one, so this is only null on a
    // draft with no turn in front of it, which should not happen.
    const asked = [...messages.slice(0, -1)].reverse().find((item) => item.role === "user");
    return asked ? followUpsFor(asked.content) : [];
  }, [messages]);

  // Resume watching anything still in flight, including after a reload. This is
  // the payoff from persisting the thread: a refresh mid-generation picks the
  // draft back up instead of stranding it.
  useEffect(() => {
    for (const message of messages) {
      if (message.draft?.status === "generating") watch(message.draft.generationId);
    }
  }, [messages, watch]);

  /**
   * Starts an avatar render, asking for consent the first time.
   *
   * The attestation is recorded rather than assumed, and checked again inside
   * the edge function: animating a face with a voice is a deepfake when the
   * face is not the uploader's, so a client-side checkbox is not the control.
   *
   * Returns true when a render started, false when it did not, so the caller
   * can leave the composer in a sensible state either way.
   */
  const runAvatar = useCallback(
    async (
      text: string,
      imageUrl: string,
      audioUrl: string,
      optimisticId: string,
      attachments: AttachmentRef[],
    ): Promise<boolean> => {
      if (projectId === "new") {
        notify("Send a message first, then attach a photo and a voice clip.");
        return false;
      }

      const attempt = () =>
        startAvatarGeneration({ projectId, prompt: text, imageUrl, audioUrl, attachments });
      let result = await attempt();

      if (result.status === "consent") {
        const agreed = await confirm({
          title: "Confirm this is you",
          description: CONSENT_STATEMENT,
          confirmLabel: "I confirm",
        });
        if (!agreed) {
          notify("An avatar needs that confirmation before it can be made.");
          return false;
        }
        const recorded = await recordLikenessConsent();
        if (recorded.status !== "ok") {
          notify("Could not record that confirmation. Try again.");
          return false;
        }
        result = await attempt();
      }

      if (result.status !== "ok") {
        setMessages((current) => current.filter((message) => message.id !== optimisticId));
        notify(
          result.status === "unconfigured"
            ? "The backend is not connected yet."
            : result.status === "consent"
              ? "An avatar needs that confirmation before it can be made."
              : result.message,
        );
        return false;
      }

      setMessages((current) => [
        ...current,
        {
          id: `${nextId()}-avatar`,
          role: "assistant",
          content: AVATAR_REPLY,
          attachments: [],
          draft: {
            generationId: result.generationId,
            status: "generating" as const,
            resultUrl: null,
          },
        },
      ]);
      return true;
    },
    [projectId, confirm, nextId, setMessages, notify],
  );

  /**
   * Sends the held-back turn, with whatever the user chose to tell us.
   *
   * `clarified` goes with it either way. Answering and skipping are both a
   * decision to proceed, and without the flag a skip would simply be asked the
   * same questions again.
   */
  const proceed = useCallback(
    (payload: Parameters<typeof sendMessage>[0], answers: Readonly<Record<string, string>>) => {
      setSending(true);
      setNotice(null);

      void (async () => {
        const result = await sendMessage({
          ...payload,
          clarified: true,
          ...(Object.keys(answers).length > 0 ? { clarifyAnswers: answers } : {}),
        });
        setSending(false);

        if (result.status !== "ok") {
          notify(result.status === "error" ? result.message : "That could not be sent. Try again.");
          return;
        }

        if (result.notice) notify(result.notice, result.noticeUpgrade);
        router.refresh();
        if (projectId === "new") router.replace(`/dashboard/c/${result.projectId}` as Route);
      })();
    },
    [projectId, router, notify],
  );

  const clarify = useClarification(proceed);
  // Destructured because it is what `submit` depends on: the hook's object
  // identity changes every render, the callback on it does not.
  const { hold } = clarify;

  const submit = useCallback(
    (text: string, seeded?: readonly PendingPhoto[]) => {
      const trimmed = text.trim();
      // Checked here as well as on the button, which Enter bypasses.
      if (trimmed === "" || sending || rendering) return;

      setSending(true);
      setNotice(null);

      const optimisticId = nextId();
      const voiceClip = draft.voice;
      const {
        refs: attachmentRefs,
        optimistic: optimisticAttachments,
        photoUrls: attached,
      } = turnAttachments(seeded ?? draft.photos, voiceClip);

      const clip = draft.footage;
      const shotList = draft.shots;
      clearDraft();
      setMessages((current) => [
        ...current,
        { id: optimisticId, role: "user", content: trimmed, attachments: optimisticAttachments },
      ]);

      void (async () => {
        // A photo plus a voice clip means an avatar render rather than an
        // ordinary generation: the two inputs together are the whole signal, so
        // there is no separate mode to switch into.
        if (voiceClip && attached.length > 0 && attached[0]) {
          const outcome = await runAvatar(
            trimmed,
            attached[0],
            voiceClip.url,
            optimisticId,
            attachmentRefs,
          );
          setSending(false);
          if (outcome) return;
          return;
        }

        const validShots = shotList
          ?.filter((shot) => shot.prompt.trim().length > 0)
          .map((shot) => ({ prompt: shot.prompt.trim(), duration: shot.duration }));

        const payload = {
          projectId,
          prompt: trimmed,
          imageUrls: attached.length > 0 ? attached : undefined,
          attachments: attachmentRefs.length > 0 ? attachmentRefs : undefined,
          videoPaths: clip ? [clip.path] : undefined,
          shots: validShots && validShots.length > 0 ? validShots : undefined,
        };
        let result = await sendTurn(payload);

        /*
         * A photo of a person needs the likeness attestation, and the server
         * refuses before creating anything, so the same turn can simply be sent
         * again once it is recorded. Asked only when a person was actually
         * detected in the upload: a product shot never reaches this.
         */
        if (result.status === "consent") {
          const agreed = await confirm({
            title: "Confirm this likeness",
            description: CONSENT_STATEMENT,
            confirmLabel: "I confirm",
          });
          if (agreed) {
            const recorded = await recordLikenessConsent();
            result =
              recorded.status === "ok"
                ? await sendTurn(payload)
                : { status: "error", message: "Could not record that confirmation. Try again." };
          } else {
            result = {
              status: "error",
              message: "A photo of a person needs that confirmation before it can be used.",
            };
          }
        }

        setSending(false);

        /*
         * The request was too vague to spend a credit on, so nothing was
         * created and the questions come back instead. The optimistic message
         * stays on screen: it is what the questions are about, and withdrawing
         * it would leave them hanging over an empty thread.
         */
        if (result.status === "clarify") {
          /*
           * The reason goes into the thread as a turn of its own, before the
           * card appears.
           *
           * The questions used to arrive with nothing said: the message posted,
           * the composer was replaced by an interrogation, and a user who
           * thought their request was perfectly clear got friction with no
           * account of it. Saying that a render costs a credit and that this is
           * an attempt to spend it well turns the same pause into care.
           *
           * Not persisted. It belongs to a turn that was never recorded, and
           * writing it to the thread would leave a question hanging in the
           * history next to a video that answered it.
           */
          setMessages((current) => [
            ...current,
            {
              id: `${nextId()}-clarify`,
              role: "assistant",
              content: result.framing,
              attachments: [],
            },
          ]);
          hold({
            payload,
            questions: result.questions,
            framing: result.framing,
          });
          return;
        }

        if (result.status !== "ok") {
          // The optimistic message is withdrawn: leaving it on screen would
          // imply the turn was recorded when it was not.
          setMessages((current) => current.filter((message) => message.id !== optimisticId));
          setDraftPrompt(trimmed);
          notify(
            result.status === "unconfigured"
              ? "The backend is not connected yet, so nothing can be generated."
              : // Still asking after the attestation was recorded means the
                // record did not take. Saying so beats a second identical
                // dialog the user has already agreed to.
                result.status === "consent"
                ? "That confirmation did not save. Try sending again."
                : result.message,
          );
          return;
        }

        if (result.notice) notify(result.notice, result.noticeUpgrade);

        /**
         * The reply is appended from what the action already returned rather
         * than refetching the thread. `router.refresh()` re-rendered the whole
         * server component to obtain a message we were already holding, which
         * added a full round trip to every turn before the answer appeared.
         *
         * The server is still the source of truth: the next navigation or
         * revalidation replaces this with the persisted rows.
         */
        setMessages((current) => [
          ...current,
          {
            id: `${nextId()}-reply`,
            role: "assistant",
            content: result.reply,
            attachments: [],
            ...(result.generationId
              ? {
                  draft: {
                    generationId: result.generationId,
                    status: "generating" as const,
                    resultUrl: null,
                  },
                }
              : {}),
          },
        ]);

        /*
         * A brand-new thread now has a real project, so move to its URL. This
         * happens after the reply is on screen, not instead of it: navigating
         * first and letting the server render the turn meant the whole
         * exchange blinked out and came back, and if the render lost the race
         * the first message looked like it had never been sent.
         */
        if (projectId === "new") {
          router.replace(`/dashboard/c/${result.projectId}` as Route);
        }
      })();
    },
    [
      projectId,
      draft.photos,
      draft.voice,
      draft.footage,
      draft.shots,
      router,
      sending,
      rendering,
      runAvatar,
      confirm,
      hold,
      sendTurn,
      nextId,
      setMessages,
      clearDraft,
      setDraftPrompt,
      notify,
    ],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      {dialog}
      <ConversationHeader title={thread.title} editorHref={editorHref} />

      <ThreadTranscript
        messages={messages}
        editorHref={editorHref}
        seeded={draft.seeded}
        sending={sending}
        rendering={rendering}
        awaitingAnswer={clarify.pending !== null}
        partial={turn.partial}
        stage={turn.stage}
        notice={notice}
        followUps={followUps}
        regeneratingId={regeneratingId}
        onPickFollowUp={draft.setPrompt}
        onCancelDraft={cancelDraft}
        onRegenerate={(id) => void regenerate(id)}
        onExtend={(id) => void extend(id)}
        endRef={endRef}
      />

      {/* pb-safe on the outer edge, so the composer clears the home indicator on
          an installed app without the padding doubling on a desktop. */}
      <div className="sticky bottom-0 bg-canvas pb-safe pt-2">
        {/*
          The questions take the composer's place rather than sitting above it.
          This turn is already written and waiting on one answer, so a text box
          alongside would invite a second turn that cannot be sent yet.
        */}
        {clarify.pending ? (
          <div className="pb-4">
            <QuestionPrompt
              key={clarify.current?.label ?? "done"}
              question={clarify.current ?? clarify.pending.questions[0]!}
              index={clarify.answered}
              total={clarify.total}
              disabled={sending}
              onAnswer={clarify.answer}
              onSkip={clarify.skip}
            />
          </div>
        ) : (
          <div className="pb-4">
            <PromptComposer
              value={draft.prompt}
              onChange={draft.setPrompt}
              onSubmit={() => submit(draft.prompt)}
              projectId={projectId}
              photos={draft.photos}
              onPhotosChange={draft.setPhotos}
              voice={draft.voice}
              onVoice={draft.setVoice}
              footage={draft.footage}
              onFootage={draft.setFootage}
              shots={draft.shots}
              onShotsChange={draft.setShots}
              busy={sending || rendering}
              credits={thread.credits}
              // Only while a turn is streaming. A queued render is the
              // provider's to finish and has its own cancel on the draft.
              onStop={sending ? turn.cancel : undefined}
            />

            {/*
              Only for somebody who has sent something and never attached
              anything. Before the first message the screen already explains
              what to do, and once a photo has been sent the button is found.
            */}
            <Coachmark
              tip={TIPS.attach}
              when={
                messages.length > 0 && messages.every((message) => message.attachments.length === 0)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
