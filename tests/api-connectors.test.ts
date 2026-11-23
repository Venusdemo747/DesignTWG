import { describe, expect, it } from "vitest";
import { ZohoCrmAdapter } from "../src/connectors/zoho-crm/adapter";
import { ZohoProjectsAdapter } from "../src/connectors/zoho-projects/adapter";
import { QuickBooksAdapter } from "../src/connectors/quickbooks/adapter";
import { Microsoft365Adapter } from "../src/connectors/microsoft-365/adapter";

describe("API Connector Adapters (Offline & Scaffold Behavior)", () => {
  it("Zoho CRM reports honest NOT_CONFIGURED state when credentials absent", async () => {
    const adapter = new ZohoCrmAdapter({ clientId: undefined, clientSecret: undefined, refreshToken: undefined });
    expect(adapter.getConnectionState()).toBe("NOT_CONFIGURED");
    expect(adapter.getMissingCredentials().length).toBe(3);
    expect(adapter.getRequiredScopes().length).toBeGreaterThan(0);

    const testResult = await adapter.testConnection();
    expect(testResult.state).toBe("NOT_CONFIGURED");
    expect(testResult.isLiveVerified).toBe(false);
    expect(testResult.message).toContain("Live API connection unverified");

    const health = await adapter.checkHealth();
    expect(health.connectionState).toBe("MOCK");
    expect(health.simulated).toBe(true);
    expect(health.isLiveVerified).toBe(false);
  });

  it("Zoho Projects reports missing portal and credentials honestly", async () => {
    const adapter = new ZohoProjectsAdapter({ clientId: undefined });
    expect(adapter.getConnectionState()).toBe("NOT_CONFIGURED");
    const testResult = await adapter.testConnection();
    expect(testResult.isLiveVerified).toBe(false);
  });

  it("QuickBooks Online strictly enforces isReadOnly = true invariant", async () => {
    const adapter = new QuickBooksAdapter({ clientId: undefined });
    expect(adapter.isReadOnly).toBe(true);
    expect(adapter.getConnectionState()).toBe("NOT_CONFIGURED");

    const health = await adapter.checkHealth();
    expect(health.isReadOnly).toBe(true);
    expect(health.notes).toContain("STRICTLY READ-ONLY");

    // Live query without verified connection must throw safe error
    await expect(adapter.queryReadOnly("Customer")).rejects.toThrow("Live connection unverified");
  });

  it("Microsoft 365 reports tenant and permission requirements honestly", async () => {
    const adapter = new Microsoft365Adapter({ tenantId: undefined });
    expect(adapter.getConnectionState()).toBe("NOT_CONFIGURED");
    const health = await adapter.checkHealth();
    expect(health.notes).toContain("Document permissions preserved; no user bypass permitted.");
  });
});
