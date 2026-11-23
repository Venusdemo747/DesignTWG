export type ActionDomain =
  | "commercial_proposal_pricing"
  | "stage_gate_signoff"
  | "milestone_invoice_release"
  | "crm_followup_email"
  | "scope_change_order";

export interface ApprovalMatrixEntry {
  actionType: ActionDomain;
  description: string;
  primaryApprover: string; // [ASSUMPTION]: Irwin, Nameeta, or Anju
  primaryApproverRole: string; // [ASSUMPTION]
  fallbackApprover: string;
  escalationTimeoutHours: number;
  requiresDoubleSignoff: boolean;
  maxDailyPendingLimit: number; // Reviewer-load safeguard
}

export interface ReviewerWorkloadStatus {
  reviewerName: string;
  currentPendingCount: number;
  maxDailyLimit: number;
  isOverloaded: boolean;
  recommendedRoute: "direct" | "batch_digest" | "escalate_fallback";
}

export class ApprovalMatrixManager {
  // Stored as data, fully configurable without code changes
  private matrix: ApprovalMatrixEntry[] = [
    {
      actionType: "commercial_proposal_pricing",
      description: "Approval for outbound client proposals, fee quotes, and fee discount revisions.",
      primaryApprover: "Irwin",
      primaryApproverRole: "Executive / Commercial Lead [ASSUMPTION]",
      fallbackApprover: "Nameeta",
      escalationTimeoutHours: 24,
      requiresDoubleSignoff: false,
      maxDailyPendingLimit: 8,
    },
    {
      actionType: "stage_gate_signoff",
      description: "Approval for advancing project across architectural design gates (D1 through D5).",
      primaryApprover: "Nameeta",
      primaryApproverRole: "Project Manager / Design Director [ASSUMPTION]",
      fallbackApprover: "Irwin",
      escalationTimeoutHours: 36,
      requiresDoubleSignoff: false,
      maxDailyPendingLimit: 12,
    },
    {
      actionType: "milestone_invoice_release",
      description: "Human authorization required before releasing or drafting invoice requests in QuickBooks.",
      primaryApprover: "Anju",
      primaryApproverRole: "Finance Lead [ASSUMPTION]",
      fallbackApprover: "Irwin",
      escalationTimeoutHours: 24,
      requiresDoubleSignoff: false,
      maxDailyPendingLimit: 10,
    },
    {
      actionType: "crm_followup_email",
      description: "Review and release of AI-drafted client follow-up communications on stalled deals.",
      primaryApprover: "Sarah Chen",
      primaryApproverRole: "Sales Lead",
      fallbackApprover: "Irwin",
      escalationTimeoutHours: 12,
      requiresDoubleSignoff: false,
      maxDailyPendingLimit: 15,
    },
    {
      actionType: "scope_change_order",
      description: "Commercial approval of out-of-scope work additions prior to architectural drafting.",
      primaryApprover: "Irwin",
      primaryApproverRole: "Executive",
      fallbackApprover: "Nameeta",
      escalationTimeoutHours: 24,
      requiresDoubleSignoff: true,
      maxDailyPendingLimit: 6,
    },
  ];

  // In-memory counter for active pending approvals per reviewer (Reviewer-load safeguard)
  private readonly pendingPerReviewer = new Map<string, number>();

  public getMatrix(): ApprovalMatrixEntry[] {
    return [...this.matrix];
  }

  public updateEntry(entry: ApprovalMatrixEntry): void {
    const idx = this.matrix.findIndex((m) => m.actionType === entry.actionType);
    if (idx >= 0) {
      this.matrix[idx] = entry;
    } else {
      this.matrix.push(entry);
    }
  }

  public getReviewerWorkload(reviewerName: string): ReviewerWorkloadStatus {
    const count = this.pendingPerReviewer.get(reviewerName) || 0;
    const entry = this.matrix.find(
      (m) => m.primaryApprover.toLowerCase() === reviewerName.toLowerCase()
    );
    const limit = entry?.maxDailyPendingLimit || 10;
    const isOverloaded = count >= limit;

    let recommendedRoute: "direct" | "batch_digest" | "escalate_fallback" = "direct";
    if (count >= limit * 1.5) {
      recommendedRoute = "escalate_fallback";
    } else if (isOverloaded) {
      recommendedRoute = "batch_digest";
    }

    return {
      reviewerName,
      currentPendingCount: count,
      maxDailyLimit: limit,
      isOverloaded,
      recommendedRoute,
    };
  }

  public routeApproval(actionType: ActionDomain): {
    assignedTo: string;
    routeMethod: "direct" | "batch_digest" | "escalate_fallback";
    timeoutHours: number;
  } {
    const rule = this.matrix.find((m) => m.actionType === actionType);
    if (!rule) {
      return { assignedTo: "Irwin", routeMethod: "direct", timeoutHours: 24 };
    }

    const workload = this.getReviewerWorkload(rule.primaryApprover);

    if (workload.recommendedRoute === "escalate_fallback") {
      return {
        assignedTo: rule.fallbackApprover,
        routeMethod: "direct",
        timeoutHours: rule.escalationTimeoutHours,
      };
    }

    return {
      assignedTo: rule.primaryApprover,
      routeMethod: workload.recommendedRoute,
      timeoutHours: rule.escalationTimeoutHours,
    };
  }

  public incrementPending(reviewerName: string): void {
    const count = this.pendingPerReviewer.get(reviewerName) || 0;
    this.pendingPerReviewer.set(reviewerName, count + 1);
  }

  public decrementPending(reviewerName: string): void {
    const count = this.pendingPerReviewer.get(reviewerName) || 0;
    this.pendingPerReviewer.set(reviewerName, Math.max(0, count - 1));
  }
}
