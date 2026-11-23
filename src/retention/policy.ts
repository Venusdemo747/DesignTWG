import { IDatabaseClient, getDatabaseClient } from "../db/client";

export interface RetentionPolicyRule {
  tableName: string;
  retentionDays: number;
  isPurgeable: boolean;
  legalJustification: string;
}

export class DataRetentionPolicyManager {
  private readonly policies: RetentionPolicyRule[] = [
    {
      tableName: "sessions",
      retentionDays: 7,
      isPurgeable: true,
      legalJustification: "Stale authenticated session tokens.",
    },
    {
      tableName: "ingested_records",
      retentionDays: 90,
      isPurgeable: true,
      legalJustification: "Raw staging CSV files and temporary preview uploads.",
    },
    {
      tableName: "transfer_events",
      retentionDays: 365, // 1 year
      isPurgeable: true,
      legalJustification: "Operational integration transaction logs.",
    },
    {
      tableName: "canonical_deals",
      retentionDays: 2555, // 7 years
      isPurgeable: false,
      legalJustification: "Commercial contract history (Canadian CRA standard).",
    },
    {
      tableName: "canonical_projects",
      retentionDays: 2555, // 7 years
      isPurgeable: false,
      legalJustification: "Architectural liability & structural precedent archive.",
    },
    {
      tableName: "audit_log",
      retentionDays: 2555, // 7 years minimum
      isPurgeable: false,
      legalJustification: "Immutable legal compliance and tamper-proof security trail.",
    },
  ];

  constructor(private readonly db: IDatabaseClient = getDatabaseClient()) {}

  public getPolicies(): RetentionPolicyRule[] {
    return [...this.policies];
  }

  public async executePurgeJob(tableName: string): Promise<{ deletedCount: number; status: string }> {
    const policy = this.policies.find((p) => p.tableName === tableName);
    if (!policy) {
      throw new Error(`No retention policy found for table: ${tableName}`);
    }

    if (!policy.isPurgeable || tableName === "audit_log") {
      throw new Error(`SECURITY & COMPLIANCE VIOLATION: Table '${tableName}' is non-purgeable under corporate retention policy.`);
    }

    const cutoffDate = new Date(Date.now() - policy.retentionDays * 86400000).toISOString();
    let query = "";

    if (tableName === "sessions") {
      query = `DELETE FROM sessions WHERE expires_at < $1;`;
    } else if (tableName === "ingested_records") {
      query = `DELETE FROM ingested_records WHERE created_at < $1;`;
    } else if (tableName === "transfer_events") {
      query = `DELETE FROM transfer_events WHERE timestamp < $1;`;
    } else {
      throw new Error(`Unsupported purge target: ${tableName}`);
    }

    const res = await this.db.query(query, [cutoffDate]);
    return {
      deletedCount: res.rowCount,
      status: `Successfully purged records older than ${policy.retentionDays} days (${cutoffDate})`,
    };
  }

  /**
   * Data-minimization utility for LLM Prompts (Section 8 Privacy Invariant)
   * Strips client direct contact info, tax IDs, and billing credentials before sending to Claude.
   */
  public minimizeRecordForPrompt(record: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = new Set([
      "password",
      "secret",
      "token",
      "creditCard",
      "card_number",
      "bank_account",
      "tax_number",
      "phone",
      "direct_phone",
      "personal_email",
    ]);

    const minimized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        continue; // omit sensitive field
      }
      if (typeof value === "object" && value !== null) {
        minimized[key] = this.minimizeRecordForPrompt(value as Record<string, unknown>);
      } else {
        minimized[key] = value;
      }
    }

    return minimized;
  }
}
