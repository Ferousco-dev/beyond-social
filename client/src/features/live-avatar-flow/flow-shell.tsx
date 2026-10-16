"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { getAssetGroup } from "@/features/asset-groups/actions";
import type { AssetGroup, AssetGroupDetail } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { BriefStep, type AvatarBrief } from "./brief-step";
import { GroupStep } from "./group-step";
import { PromptStep } from "./prompt-step";
import { UploadsStep } from "./uploads-step";

const STEPS = ["Group", "Assets", "Brief", "Prompt"] as const;

/** Live Avatar: group, uploads, brief, prompt, generate. Uploads only. */
export function LiveAvatarFlow() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [group, setGroup] = useState<AssetGroup | null>(null);
  const [detail, setDetail] = useState<AssetGroupDetail | null>(null);
  const [voiceId, setVoiceId] = useState("");
  const [brief, setBrief] = useState<AvatarBrief>({ objective: "", audience: "", product: "", style: "" });
  const [isContinuing, setIsContinuing] = useState(false);
  const continueTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (continueTimerRef.current !== null) {
        window.clearTimeout(continueTimerRef.current);
      }
    };
  }, []);

  function handleContinue(): void {
    if (isContinuing || step >= STEPS.length - 1) return;
    setIsContinuing(true);
    if (continueTimerRef.current !== null) {
      window.clearTimeout(continueTimerRef.current);
    }
    continueTimerRef.current = window.setTimeout(() => {
      setStep((current) => current + 1);
      setIsContinuing(false);
    }, 220);
  }

  async function enterAssets(next: AssetGroup): Promise<void> {
    setGroup(next);
    const result = await getAssetGroup(next.id);
    if (result.status === "ok") setDetail(result.group);
    setStep(1);
  }

  useEffect(() => {
    const groupId = searchParams.get("group");
    if (!groupId || group !== null) return;
    void getAssetGroup(groupId).then((result) => {
      if (result.status !== "ok") return;
      setGroup(result.group);
      setDetail(result.group);
      setStep(1);
    });
  }, [group, searchParams]);

  const ready =
    step === 0 ? group !== null :
    step === 1 ? detail !== null && detail.slots.face !== "" && detail.slots.voice !== "" && voiceId !== "" :
    step === 2 ? brief.objective.trim() !== "" && brief.audience.trim() !== "" :
    true;

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Progress" className="flex gap-1.5">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => {
                if (index === 0 || (index === 1 && group) || (index === 2 && detail) || (index === 3 && detail)) setStep(index);
              }}
              aria-current={index === step ? "step" : undefined}
              className="group w-full cursor-pointer py-1 text-left"
            >
              <span className={cn("block h-1.5 rounded-full transition-colors", index <= step ? "bg-primary" : "bg-hairline group-hover:bg-cloud")} />
              <span className={cn("mt-1.5 hidden text-[11px] sm:block", index === step ? "font-medium text-ink" : "text-ink-soft")}>
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <h2 className="text-lg font-semibold text-ink">{STEPS[step]}</h2>

      {step === 0 ? <GroupStep selected={group} onSelect={(next) => void enterAssets(next)} /> : null}
      {step === 1 && group ? <UploadsStep group={group} voiceId={voiceId} onChange={setDetail} onVoiceReady={setVoiceId} /> : null}
      {step === 2 ? <BriefStep brief={brief} onChange={setBrief} /> : null}
      {step === 3 && detail ? <PromptStep group={detail} brief={brief} voiceId={voiceId} script="" /> : null}

      <div className="flex gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={isContinuing}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={!ready || isContinuing}
            aria-busy={isContinuing}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isContinuing ? <Spinner className="size-4" /> : null}
            <span>{isContinuing ? "Continuing" : "Continue"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
