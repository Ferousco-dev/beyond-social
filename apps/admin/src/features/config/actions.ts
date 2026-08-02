"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { clientIp } from "@/lib/auth/request";

import { fetchConfigRows, setConfigRow } from "./rpc";
import { parseConfigInput } from "./value";

export type ConfigFormState =
  { status: "idle" } | { status: "saved"; savedAt: string } | { status: "error"; message: string };

const submissionSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

/**
 * Saves one configuration value.
 *
 * The type the value must have comes from the row itself rather than from the
 * form, so a tampered submission cannot declare its own type. The database
 * checks it again and writes the audit row in the same function, so this action
 * is a convenience for the operator, never the security boundary.
 */
export async function saveConfigAction(
  _previous: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  await requireAdmin();

  const submission = submissionSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
  });

  if (!submission.success) {
    return { status: "error", message: "That submission could not be read." };
  }

  const rows = await fetchConfigRows();
  if (!rows) {
    return { status: "error", message: "Configuration could not be read. Nothing was changed." };
  }

  const row = rows.find((candidate) => candidate.key === submission.data.key);
  if (!row) {
    return { status: "error", message: "That key no longer exists." };
  }

  const parsed = parseConfigInput(row.value_type, submission.data.value);
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  const result = await setConfigRow(row.key, parsed.value, clientIp(await headers()));
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/config");
  return { status: "saved", savedAt: result.row.updated_at.toISOString() };
}
