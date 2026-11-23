import { describe, expect, it } from "vitest";
import { ZohoCrmConnector } from "../src/connectors/zoho-crm";
import { ZohoProjectsConnector } from "../src/connectors/zoho-projects";
import { QuickBooksConnector } from "../src/connectors/quickbooks";
import { Microsoft365Connector } from "../src/connectors/microsoft-365";
import { DataMappingService } from "../src/mapping";
import { TransferMonitor } from "../src/transfer";

describe("Transfer Monitor & Sync Engine", () => {
  it("tracks transfer events, computes stats, and handles pipelines", async () => {
    const crm = new ZohoCrmConnector();
    const projects = new ZohoProjectsConnector();
    const qbo = new QuickBooksConnector();
    const m365 = new Microsoft365Connector();
    const mapper = new DataMappingService();

    const monitor = new TransferMonitor(crm, projects, qbo, m365, mapper);

    const initialTransfers = monitor.getTransfers();
    expect(initialTransfers.length).toBeGreaterThan(0);

    const stats = monitor.getStats();
    expect(stats.totalTransfers).toBe(initialTransfers.length);
    expect(stats.successful).toBeGreaterThan(0);
    expect(stats.successRate).toBeGreaterThan(90);

    // Test Deal Won Sync Pipeline
    const dealWonResult = await monitor.triggerDealWonSync();
    expect(dealWonResult.project).toBeDefined();
    expect(dealWonResult.customer).toBeDefined();
    expect(dealWonResult.sharePoint).toBeDefined();
    expect(dealWonResult.teamsAlert).toBeDefined();

    const afterDealTransfers = monitor.getTransfers();
    expect(afterDealTransfers.length).toBe(initialTransfers.length + 4);

    // Test Milestone Sync Pipeline
    const milestoneResult = await monitor.triggerMilestoneSync();
    expect(milestoneResult.invoice).toBeDefined();
    expect(milestoneResult.teamsAlert).toBeDefined();

    // Test Payment Sync Pipeline
    const paymentResult = await monitor.triggerPaymentSync();
    expect(paymentResult.invoice).toBeDefined();
    expect(paymentResult.alert).toBeDefined();

    // Test Fault Injection and Auto-Retry
    const fault = monitor.simulateFaultAndAutoRetry();
    expect(fault.status).toBe("FAILED");
    expect(fault.details).toContain("429");
  });
});
