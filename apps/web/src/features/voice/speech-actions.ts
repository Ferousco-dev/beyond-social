"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { serverEnv } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";

const ttsSchema = z.object({
  text: z.string().trim().min(1, "Type something to speak").max(4096),
  voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
});

export type TtsResult =
  | { status: "ok"; url: string; path: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function textToSpeech(input: z.input<typeof ttsSchema>): Promise<TtsResult> {
  const parsed = ttsSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };
  if (!serverEnv.OPENAI_API_KEY) {
    return { status: "error", message: "Speech generation is not configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again" };

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: parsed.data.voice,
      input: parsed.data.text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const path = `${user.id}/${crypto.randomUUID()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, buffer, { contentType: "audio/mpeg" });
    if (uploadError) {
      logger.error("could not upload tts audio", { error: uploadError.message });
      return { status: "error", message: "Could not save the generated audio" };
    }

    const { data: signed } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 2 * 60 * 60);
    if (!signed?.signedUrl) {
      return { status: "error", message: "Could not sign the generated audio" };
    }

    return { status: "ok", url: signed.signedUrl, path };
  } catch (error) {
    logger.error("tts failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not generate speech" };
  }
}

const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;

export type TranscribeResult =
  | { status: "ok"; text: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function transcribeAudio(input: { path: string }): Promise<TranscribeResult> {
  if (!input.path || typeof input.path !== "string") {
    return { status: "error", message: "No audio file provided" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };
  if (!serverEnv.OPENAI_API_KEY) {
    return { status: "error", message: "Transcription is not configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again" };

  if (!input.path.startsWith(`${user.id}/`)) {
    return { status: "error", message: "That clip could not be transcribed" };
  }

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("uploads")
      .download(input.path);
    if (downloadError || !file) {
      return { status: "error", message: "Could not read that audio file" };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MAX_TRANSCRIBE_BYTES) {
      return { status: "error", message: "Audio file is too large to transcribe" };
    }

    const ext = input.path.split(".").pop() ?? "wav";
    const blob = new File([bytes], `audio.${ext}`, {
      type: ext === "mp3" ? "audio/mpeg" : `audio/${ext}`,
    });

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: blob,
    });

    return { status: "ok", text: transcription.text };
  } catch (error) {
    logger.error("transcription failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not transcribe that audio" };
  }
}
