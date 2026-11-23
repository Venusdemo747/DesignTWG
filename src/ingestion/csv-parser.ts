export class CsvParser {
  public static parse(csvContent: string): Array<Record<string, string>> {
    const lines = this.splitIntoRows(csvContent.trim());
    if (lines.length === 0) return [];

    const headers = this.parseLine(lines[0]).map((h) => h.trim());
    const records: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseLine(line);
      const row: Record<string, string> = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (values[j] !== undefined ? values[j].trim() : "");
      }

      records.push(row);
    }

    return records;
  }

  public static serialize<T extends Record<string, unknown>>(
    records: T[],
    columns?: string[],
  ): string {
    if (records.length === 0) return "";

    const headers = columns || Object.keys(records[0]);
    const lines: string[] = [headers.map((h) => this.escapeField(h)).join(",")];

    for (const record of records) {
      const row = headers.map((header) => {
        const val = record[header];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return this.escapeField(JSON.stringify(val));
        return this.escapeField(String(val));
      });
      lines.push(row.join(","));
    }

    return lines.join("\n");
  }

  private static splitIntoRows(text: string): string[] {
    const rows: string[] = [];
    let currentRow = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
        currentRow += char;
      } else if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && text[i + 1] === "\n") {
          i++; // Skip \n in CRLF
        }
        if (currentRow.trim().length > 0) {
          rows.push(currentRow);
        }
        currentRow = "";
      } else {
        currentRow += char;
      }
    }

    if (currentRow.trim().length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  private static parseLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        fields.push(currentField);
        currentField = "";
      } else {
        currentField += char;
      }
    }

    fields.push(currentField);
    return fields;
  }

  private static escapeField(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }
}

export function parseCurrency(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function isValidIsoDate(raw: string | undefined): boolean {
  if (!raw) return false;
  // Matches YYYY-MM-DD or full ISO 8601
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!dateRegex.test(raw)) return false;
  const parsed = new Date(raw);
  return !isNaN(parsed.getTime());
}

export function isValidEmail(raw: string | undefined): boolean {
  if (!raw) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}
