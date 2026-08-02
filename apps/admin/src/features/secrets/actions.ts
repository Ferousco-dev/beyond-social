"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { clientIp } from "@/lib/auth/request";

import { callSecretsRpc } from "./rpc";
import { clearInputSchema, rotateInputSchema } from "./schemas";

export type SecretActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const SECRETS_PATH = "/secrets";

/**
 * Neither action writes an audit row from here.
 *
 * `admin_secret_rotate` and `admin_secret_clear` call `admin_log_action`
 * themselves, inside the same transaction as the change. That is deliberate: an
 * audit write issued from the app is a second round trip that can fail after
 * the change has already committed, which is exactly the case that produces an
 * unlogged rotation of a production credential.
 */

export async function rotateSecretAction(
  _previous: SecretActionState,
  formData: FormData,
): Promise<SecretActionState> {
  await requireAdmin();

  const parsed = rotateInputSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
    // An unchecked box is absent from the payload rather than false.
    storeValue: formData.get("storeValue") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "That value was not accepted.",
    };
  }

  const { key, value, storeValue } = parsed.data;

  const { error } = await callSecretsRpc("admin_secret_rotate", {
    p_key: key,
    p_value: value,
    p_store_value: storeValue,
    p_ip: clientIp(await headers()),
  });

  if (error) {
    // The database message describes the metadata that was refused, never the
    // value, so it is safe to surface. It is the only clue the operator gets.
    return { status: "error", message: `Rotation was not recorded: ${error}` };
  }

  revalidatePath(SECRETS_PATH);

  return {
    status: "success",
    message: storeValue
      ? `${key} recorded, with an encrypted copy kept in the vault.`
      : `${key} recorded. No copy of the value was kept.`,
  };
}

export async function clearSecretAction(
  _previous: SecretActionState,
  formData: FormData,
): Promise<SecretActionState> {
  await requireAdmin();

  const parsed = clearInputSchema.safeParse({ key: formData.get("key") });

  if (!parsed.success) {
    return { status: "error", message: "That is not a secret in this registry." };
  }

  const { error } = await callSecretsRpc("admin_secret_clear", {
    p_key: parsed.data.key,
    p_ip: clientIp(await headers()),
  });

  if (error) {
    return { status: "error", message: `Could not mark it unset: ${error}` };
  }

  revalidatePath(SECRETS_PATH);

  return {
    status: "success",
    message: `${parsed.data.key} is now marked as not set, and any stored copy was destroyed.`,
  };
}
