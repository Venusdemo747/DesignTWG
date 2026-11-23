import { spawn } from "node:child_process";
import net from "node:net";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres_dev_password@127.0.0.1:5432/designtwg_db";

function checkTcpPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function main() {
  console.log(`[test:postgres] Checking PostgreSQL TCP connection at 127.0.0.1:5432...`);
  const isReachable = await checkTcpPort("127.0.0.1", 5432);

  if (!isReachable) {
    console.error(`
================================================================================
[WARNING] Real PostgreSQL 16 server is NOT reachable on 127.0.0.1:5432.
================================================================================
To run the test suite against a real PostgreSQL instance:
1. Start the container:
   docker compose up -d
2. Run migrations:
   npm run test:postgres

Notice: On machines where Docker is not installed or the daemon is not running,
the test suite uses @electric-sql/pglite (the official PostgreSQL 16 engine
compiled to WASM with real catalog schema and PL/pgSQL triggers).
================================================================================
`);
    process.exit(1);
  }

  console.log(`[test:postgres] PostgreSQL reachable! Executing migrations and test suite against: ${DATABASE_URL}`);
  const env = { ...process.env, DATABASE_URL };

  const child = spawn("npx", ["vitest", "run"], {
    stdio: "inherit",
    shell: true,
    env,
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

void main();
