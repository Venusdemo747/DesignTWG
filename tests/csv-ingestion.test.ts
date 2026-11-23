import { describe, expect, it } from "vitest";
import { CsvParser, isValidEmail, isValidIsoDate, parseCurrency } from "../src/ingestion/csv-parser";
import { CsvIngestionValidator } from "../src/ingestion/validator";
import { CanonicalDataRegistry } from "../src/ingestion/registry";
import { CSV_TEMPLATES } from "../src/ingestion/templates";

describe("CSV Parser & Normalizers", () => {
  it("correctly parses RFC 4180 CSV with quotes, commas, and whitespace", () => {
    const raw = `id,name,value\n"1","Acme, Inc.",$1000\n2,Beta Corp,$2500`;
    const parsed = CsvParser.parse(raw);
    expect(parsed.length).toBe(2);
    expect(parsed[0].id).toBe("1");
    expect(parsed[0].name).toBe("Acme, Inc.");
    expect(parsed[0].value).toBe("$1000");
  });

  it("normalizes currency amounts and validates dates and emails", () => {
    expect(parseCurrency("$185,000.50")).toBe(185000.5);
    expect(parseCurrency("25000")).toBe(25000);
    expect(parseCurrency("invalid")).toBe(0);

    expect(isValidIsoDate("2026-10-24")).toBe(true);
    expect(isValidIsoDate("2026-10-24T12:00:00Z")).toBe(true);
    expect(isValidIsoDate("10/24/2026")).toBe(false);

    expect(isValidEmail("test@designtwg.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
  });
});

describe("CSV Ingestion Validator", () => {
  const registry = new CanonicalDataRegistry();

  it("validates valid customer template cleanly", () => {
    const report = CsvIngestionValidator.validate(
      "customers",
      CSV_TEMPLATES.customers,
      registry.getExistingIndex(),
    );
    expect(report.totalRows).toBe(3);
    expect(report.validRows).toBe(3);
    expect(report.invalidRows).toBe(0);
    expect(report.canProceedWithImport).toBe(true);
  });

  it("detects in-batch duplicates", () => {
    const duplicateCsv = `id,company_name,email\nACC-1,Alpha LLC,a@alpha.com\nACC-1,Duplicate Alpha,b@alpha.com`;
    const report = CsvIngestionValidator.validate(
      "customers",
      duplicateCsv,
      registry.getExistingIndex(),
    );
    expect(report.duplicateCount).toBe(1);
    expect(report.invalidRows).toBe(1);
    expect(report.canProceedWithImport).toBe(false);
  });

  it("detects orphaned foreign references", () => {
    const orphanContactCsv = `id,account_id,first_name,last_name,email\nCNT-999,NON_EXISTENT_ACC,John,Doe,john@doe.com`;
    const report = CsvIngestionValidator.validate(
      "contacts",
      orphanContactCsv,
      registry.getExistingIndex(),
    );
    expect(report.orphanedRefCount).toBe(1);
    expect(report.invalidRows).toBe(1);
  });

  it("prevents silent overwrites on conflicting existing records", () => {
    // SYN-ACC-001 already exists in registry
    const conflictCsv = `id,company_name,email\nSYN-ACC-001,Different Name LLC,diff@test.com`;
    const report = CsvIngestionValidator.validate(
      "customers",
      conflictCsv,
      registry.getExistingIndex(),
    );
    expect(report.conflictCount).toBe(1);
    expect(report.canProceedWithImport).toBe(false);
  });
});
