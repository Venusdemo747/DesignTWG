import { describe, expect, it } from "vitest";
import { ZohoCrmConnector } from "../src/connectors/zoho-crm";
import { ZohoProjectsConnector } from "../src/connectors/zoho-projects";
import { QuickBooksConnector } from "../src/connectors/quickbooks";
import { Microsoft365Connector } from "../src/connectors/microsoft-365";
import { HealthAggregator } from "../src/health";

describe("Health Aggregator", () => {
  it("aggregates connection health across all four integration systems", async () => {
    const crm = new ZohoCrmConnector();
    const projects = new ZohoProjectsConnector();
    const qbo = new QuickBooksConnector();
    const m365 = new Microsoft365Connector();

    const aggregator = new HealthAggregator(crm, projects, qbo, m365);
    const report = await aggregator.getReport();

    expect(report.overallStatus).toBe("healthy");
    expect(report.activeSystemsCount).toBe(4);
    expect(report.totalSystemsCount).toBe(4);
    expect(report.systems.length).toBe(4);
    expect(report.systems.map((s) => s.id)).toEqual([
      "zoho-crm",
      "zoho-projects",
      "quickbooks",
      "microsoft-365",
    ]);
    expect(report.averageLatencyMs).toBeGreaterThan(0);
    expect(report.summary.crm).toContain("Zoho CRM");
  });
});
