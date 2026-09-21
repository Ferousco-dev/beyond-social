"use client";

import Image from "next/image";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Spinner } from "@/components/ui/spinner";

import { updateProfileImage } from "../profile-image-actions";

export function ProfileImageForm({
  avatarUrl,
  initials,
}: {
  readonly avatarUrl: string | null;
  readonly initials: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(file: File | undefined): void {
    if (!file) return;
    const formData = new FormData();
    formData.set("avatar", file);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setMessage(null);
    startTransition(() => {
      void updateProfileImage(formData).then((result) => {
        setFailed(result.status !== "ok");
        setMessage(result.message);
        if (result.status !== "ok") setPreview(avatarUrl);
        else router.refresh();
        URL.revokeObjectURL(localPreview);
      });
    });
  }

  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={pending}
        aria-label={preview ? "Change profile image" : "Add profile image"}
        className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-cloud text-lg font-medium text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <Image src={preview} alt="" fill sizes="80px" unoptimized className="object-cover" />
        ) : (
          initials
        )}
        <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-ink/70 text-canvas transition-colors group-hover:bg-ink/80">
          {pending ? <Spinner className="size-3.5" /> : <Camera className="size-3.5" aria-hidden />}
        </span>
      </button>
      {message && failed ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
