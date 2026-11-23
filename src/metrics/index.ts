export interface SuccessMetric {
  id: string;
  name: string;
  description: string;
  baseline: {
    value: number | null;
    unit: string;
    capturedAt: string | null;
    isVerified: boolean;
  };
  pilotTarget: {
    targetValue: string;
    label: "illustrative, not verified" | "verified_target";
  };
  actual: {
    value: number | null;
    unit: string;
    measuredAt: string | null;
  };
  trend: "improving" | "stable" | "declining" | "unmeasured";
  isAchieved: boolean; // Must be false unless both baseline and actual are verified
}

export class SuccessMetricsStore {
  private readonly metrics: SuccessMetric[] = [
    {
      id: "METRIC-01",
      name: "Deals with Recorded Next Action",
      description: "Percentage of active open opportunities with an assigned owner, clear next step, and follow-up date.",
      baseline: {
        value: null,
        unit: "%",
        capturedAt: null,
        isVerified: false,
      },
      pilotTarget: {
        targetValue: ">= 95%",
        label: "illustrative, not verified",
      },
      actual: {
        value: null,
        unit: "%",
        measuredAt: null,
      },
      trend: "unmeasured",
      isAchieved: false,
    },
    {
      id: "METRIC-02",
      name: "Follow-up Actions on Time",
      description: "Percentage of scheduled sales and client follow-ups executed on or before the commitment date.",
      baseline: {
        value: null,
        unit: "%",
        capturedAt: null,
        isVerified: false,
      },
      pilotTarget: {
        targetValue: ">= 95%",
        label: "illustrative, not verified",
      },
      actual: {
        value: null,
        unit: "%",
        measuredAt: null,
      },
      trend: "unmeasured",
      isAchieved: false,
    },
    {
      id: "METRIC-03",
      name: "Overdue Milestones Surfaced Early",
      description: "Percentage of schedule delays and milestone risks identified and escalated before critical deadline breach.",
      baseline: {
        value: null,
        unit: "%",
        capturedAt: null,
        isVerified: false,
      },
      pilotTarget: {
        targetValue: "100%",
        label: "illustrative, not verified",
      },
      actual: {
        value: null,
        unit: "%",
        measuredAt: null,
      },
      trend: "unmeasured",
      isAchieved: false,
    },
    {
      id: "METRIC-04",
      name: "Weekly Report Preparation Time",
      description: "Reduction in executive hours spent manually compiling hours, project statuses, and revenue numbers.",
      baseline: {
        value: null,
        unit: "hours/week",
        capturedAt: null,
        isVerified: false,
      },
      pilotTarget: {
        targetValue: "-50% to -60%",
        label: "illustrative, not verified",
      },
      actual: {
        value: null,
        unit: "hours/week",
        measuredAt: null,
      },
      trend: "unmeasured",
      isAchieved: false,
    },
    {
      id: "METRIC-05",
      name: "D1–D5 Stage Gate Completion",
      description: "Percentage of design phase transitions with documented sign-offs and deliverable checklists complete.",
      baseline: {
        value: null,
        unit: "%",
        capturedAt: null,
        isVerified: false,
      },
      pilotTarget: {
        targetValue: ">= 95%",
        label: "illustrative, not verified",
      },
      actual: {
        value: null,
        unit: "%",
        measuredAt: null,
      },
      trend: "unmeasured",
      isAchieved: false,
    },
    {
      id: "METRIC-06",
      name: "Proposal Drafting Time",
      description: "Reduction in elapsed time from scope definition to approved client proposal delivery.",
      baseline: {
        value: null,
        unit: "hours/proposal",
        capturedAt: null,
        isVerified: false,
      },
      pilotTarget: {
        targetValue: "-40%",
        label: "illustrative, not verified",
      },
      actual: {
        value: null,
        unit: "hours/proposal",
        measuredAt: null,
      },
      trend: "unmeasured",
      isAchieved: false,
    },
    {
      id: "METRIC-07",
      name: "CEO Operational Coordination Time",
      description: "Reduction in CEO hours required for routine cross-department exception resolution.",
      baseline: {
        value: null,
        unit: "hours/week",
        capturedAt: null,
        isVerified: false,
      },
      pilotTarget: {
        targetValue: "-30%",
        label: "illustrative, not verified",
      },
      actual: {
        value: null,
        unit: "hours/week",
        measuredAt: null,
      },
      trend: "unmeasured",
      isAchieved: false,
    },
  ];

  public getAllMetrics(): SuccessMetric[] {
    return [...this.metrics];
  }

  public recordBaseline(metricId: string, value: number, unit: string): SuccessMetric {
    const metric = this.metrics.find((m) => m.id === metricId);
    if (!metric) throw new Error(`Metric not found: ${metricId}`);

    metric.baseline = {
      value,
      unit,
      capturedAt: new Date().toISOString(),
      isVerified: true,
    };
    return { ...metric };
  }

  public recordActual(metricId: string, value: number, unit: string): SuccessMetric {
    const metric = this.metrics.find((m) => m.id === metricId);
    if (!metric) throw new Error(`Metric not found: ${metricId}`);

    metric.actual = {
      value,
      unit,
      measuredAt: new Date().toISOString(),
    };

    // Evaluate trend
    if (metric.baseline.value !== null) {
      if (value > metric.baseline.value) metric.trend = "improving";
      else if (value < metric.baseline.value) metric.trend = "declining";
      else metric.trend = "stable";
    }

    // Safety rule: Never mark achieved unless verified baseline and actual both exist
    metric.isAchieved = metric.baseline.isVerified && metric.actual.measuredAt !== null;

    return { ...metric };
  }
}
