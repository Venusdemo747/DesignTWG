import { describe, expect, it } from "vitest";
import { ZohoCrmAdapter } from "../src/connectors/zoho-crm/adapter";
import { ZohoProjectsAdapter } from "../src/connectors/zoho-projects/adapter";
import { QuickBooksAdapter } from "../src/connectors/quickbooks/adapter";
import { Microsoft365Adapter } from "../src/connectors/microsoft-365/adapter";

const shouldRunLive = process.env.RUN_LIVE_TESTS === "true";

describe.skipIf(!shouldRunLive)("Opt-In Live Connection Tests (Real Credentials Required)", () => {
  it("authenticates live against Zoho CRM API", async () => {
    const adapter = new ZohoCrmAdapter();
    const result = await adapter.testConnection();
    expect(result.state).toBe("CONNECTED");
    expect(result.isLiveVerified).toBe(true);
  });

  it("authenticates live against Zoho Projects portal API", async () => {
    const adapter = new ZohoProjectsAdapter();
    const result = await adapter.testConnection();
    expect(result.state).toBe("CONNECTED");
    expect(result.isLiveVerified).toBe(true);
  });

  it("authenticates read-only live query against QuickBooks Online", async () => {
    const adapter = new QuickBooksAdapter();
    const result = await adapter.testConnection();
    expect(result.state).toBe("CONNECTED");
    expect(result.isReadOnly).toBe(true);
  });

  it("authenticates live read against Microsoft Graph", async () => {
    const adapter = new Microsoft365Adapter();
    const result = await adapter.testConnection();
    expect(result.state).toBe("CONNECTED");
  });
});
