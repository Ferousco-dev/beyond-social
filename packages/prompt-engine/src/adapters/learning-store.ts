import type { Chunk } from "../schema/chunk";
import {
  learningCandidateSchema,
  type AuditEntry,
  type CandidateStatus,
  type LearningCandidate,
} from "../schema/learning";
import type { LearningStore } from "../ports";
import type { SupabaseRpcClient } from "./vectorstore/supabase";

/**
 * Supabase-backed learning store. Candidates, audit entries, and version
 * snapshots all persist as jsonb through SECURITY DEFINER functions (migration
 * 0008), so the review workflow and audit trail stay server-authoritative and
 * multi-tenant-ready via the workspace column.
 */
export class SupabaseLearningStore implements LearningStore {
  constructor(private readonly client: SupabaseRpcClient) {}

  async recordCandidate(candidate: LearningCandidate): Promise<void> {
    await this.call("prompt_record_candidate", { p_candidate: candidate });
  }

  async getCandidate(id: string): Promise<LearningCandidate | null> {
    const data = await this.call("prompt_get_candidate", { p_id: id });
    const row = firstRow(data);
    return row ? learningCandidateSchema.parse(row) : null;
  }

  async listCandidates(
    status: CandidateStatus,
    workspaceId?: string,
  ): Promise<LearningCandidate[]> {
    const data = await this.call("prompt_list_candidates", {
      p_status: status,
      p_workspace: workspaceId ?? null,
    });
    return toArray(data).map((row) => learningCandidateSchema.parse(unwrap(row)));
  }

  async setCandidateStatus(id: string, status: CandidateStatus): Promise<void> {
    await this.call("prompt_set_candidate_status", { p_id: id, p_status: status });
  }

  async logAudit(entry: AuditEntry): Promise<void> {
    await this.call("prompt_log_audit", { p_entry: entry });
  }

  async saveVersion(chunk: Chunk, reason: string): Promise<void> {
    await this.call("prompt_save_version", { p_chunk: chunk, p_reason: reason });
  }

  private async call(fn: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new Error(`${fn} failed: ${error.message}`);
    return data;
  }
}

function toArray(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

function firstRow(data: unknown): unknown {
  const rows = toArray(data);
  return rows.length > 0 ? unwrap(rows[0]) : null;
}

/** SQL functions return either the jsonb directly or a { data } row wrapper. */
function unwrap(row: unknown): unknown {
  if (row && typeof row === "object" && "data" in row) return (row as { data: unknown }).data;
  return row;
}
