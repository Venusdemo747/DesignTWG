import { describe, expect, it } from "vitest";
import { DataMappingService } from "../src/mapping";
import { CanonicalDataRegistry } from "../src/ingestion/registry";
import { CSV_TEMPLATES } from "../src/ingestion/templates";

describe("Canonical Data Models & Mapping Specifications", () => {
  it("documents all 5 canonical entity categories with field rules and limitations", () => {
    const definitions = DataMappingService.getMappingDefinitions();
    expect(definitions.length).toBe(5);

    const categories = definitions.map((d) => d.category);
    expect(categories).toContain("Customers & Contacts");
    expect(categories).toContain("Leads & Deals");
    expect(categories).toContain("Projects & Milestones");
    expect(categories).toContain("Documents & Metadata");
    expect(categories).toContain("Financial Records (Read-Only)");

    for (const def of definitions) {
      expect(def.stableIdentifierPattern).toBeDefined();
      expect(def.duplicateResolutionRule).toBeDefined();
      expect(def.nullHandlingPolicy).toBeDefined();
      expect(def.knownLimitations.length).toBeGreaterThan(0);
      expect(def.fieldRules.length).toBeGreaterThan(0);
    }
  });

  it("registry segregates IMPORTED_CSV from MOCK_SYNTHETIC records", () => {
    const registry = new CanonicalDataRegistry();
    const counts = registry.getCounts();

    expect(counts.customers.mockSynthetic).toBeGreaterThan(0);
    expect(counts.customers.csvImported).toBe(0);

    // Ingest valid CSV
    const result = registry.executeImport("customers", CSV_TEMPLATES.customers, { dryRun: false });
    expect(result.importedCount).toBe(3);

    const updatedCounts = registry.getCounts();
    expect(updatedCounts.customers.csvImported).toBe(3);
    expect(updatedCounts.customers.total).toBe(counts.customers.total + 3);
  });
});
