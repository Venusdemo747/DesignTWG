import fs from "node:fs";
import path from "node:path";
import { IDatabaseClient, getDatabaseClient } from "./client";

export class DatabaseMigrator {
  constructor(private readonly db: IDatabaseClient = getDatabaseClient()) {}

  public async runMigrations(migrationsDir?: string): Promise<string[]> {
    const dir = migrationsDir || path.resolve(__dirname, "migrations");
    if (!fs.existsSync(dir)) {
      throw new Error(`Migrations directory not found: ${dir}`);
    }

    // Ensure _migrations table exists
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const appliedResult = await this.db.query<{ name: string }>(
      "SELECT name FROM _migrations ORDER BY id ASC;"
    );
    const appliedSet = new Set(appliedResult.rows.map((r) => r.name));

    // Read and sort SQL migration files
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const newlyApplied: string[] = [];

    for (const file of files) {
      if (!appliedSet.has(file)) {
        const filePath = path.join(dir, file);
        const sql = fs.readFileSync(filePath, "utf-8");

        // Execute migration using exec for multi-statement DDL scripts
        await this.db.exec(sql);
        await this.db.query("INSERT INTO _migrations (name) VALUES ($1);", [file]);
        newlyApplied.push(file);
      }
    }

    return newlyApplied;
  }
}
