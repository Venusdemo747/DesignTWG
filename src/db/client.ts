import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface IDatabaseClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export class PGliteDatabaseClient implements IDatabaseClient {
  private pglite: PGlite | null = null;
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(process.cwd(), "data", "pgdata");
  }

  private async getClient(): Promise<PGlite> {
    if (!this.pglite) {
      if (this.dataDir !== ":memory:") {
        fs.mkdirSync(this.dataDir, { recursive: true });
        this.pglite = new PGlite(this.dataDir);
      } else {
        this.pglite = new PGlite();
      }
    }
    return this.pglite;
  }

  public async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const client = await this.getClient();
    const result = await client.query<T>(sql, params as unknown[] | undefined);
    return {
      rows: result.rows,
      rowCount: result.rows.length,
    };
  }

  public async exec(sql: string): Promise<void> {
    const client = await this.getClient();
    await client.exec(sql);
  }

  public async close(): Promise<void> {
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = null;
    }
  }
}

export class PgPoolDatabaseClient implements IDatabaseClient {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  public async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const result = await this.pool.query<pg.QueryResultRow>(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? result.rows.length,
    };
  }

  public async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

let dbInstance: IDatabaseClient | null = null;

export function getDatabaseClient(): IDatabaseClient {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && databaseUrl.startsWith("postgres://")) {
      dbInstance = new PgPoolDatabaseClient(databaseUrl);
    } else {
      const dataDir = process.env.NODE_ENV === "test" ? ":memory:" : undefined;
      dbInstance = new PGliteDatabaseClient(dataDir);
    }
  }
  return dbInstance;
}

export async function resetDatabaseClient(client?: IDatabaseClient): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
  }
  dbInstance = client ?? null;
}
