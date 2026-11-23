import crypto from "node:crypto";
import { Request } from "express";
import { AppRole, AuthenticatedUser, AuthSession, IAuthProvider } from "./types";
import { IEntityRepository, PostgresEntityRepository } from "../db/repository";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class DevAuthProvider implements IAuthProvider {
  public readonly name = "DevAuthProvider";

  // Rate limiting / lockout tracker for dev login attempts
  private readonly failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

  constructor(private readonly repo: IEntityRepository = new PostgresEntityRepository()) {}

  public recordFailedLogin(identifier: string): void {
    const now = Date.now();
    const existing = this.failedAttempts.get(identifier) || { count: 0, lockedUntil: 0 };
    existing.count += 1;
    if (existing.count >= 5) {
      existing.lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
    }
    this.failedAttempts.set(identifier, existing);
  }

  public isLockedOut(identifier: string): boolean {
    const existing = this.failedAttempts.get(identifier);
    if (!existing) return false;
    if (Date.now() < existing.lockedUntil) return true;
    if (Date.now() >= existing.lockedUntil && existing.lockedUntil > 0) {
      this.failedAttempts.delete(identifier);
    }
    return false;
  }

  public clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  public async loginDev(role: AppRole): Promise<AuthSession> {
    if (this.isLockedOut(role)) {
      throw new Error(`Account temporarily locked out due to too many failed attempts for role '${role}'. Try again later.`);
    }

    const roleToEmail: Record<AppRole, { email: string; name: string }> = {
      Executive: { email: "irwin@designtwg.com", name: "Irwin" },
      "Sales Lead": { email: "sarah.sales@designtwg.com", name: "Sarah Chen" },
      "Project Manager": { email: "nameeta@designtwg.com", name: "Nameeta" },
      Designer: { email: "david.design@designtwg.com", name: "David Ross" },
      Finance: { email: "anju@designtwg.com", name: "Anju" },
      Admin: { email: "admin@designtwg.com", name: "Alex Admin" },
      Viewer: { email: "viewer@designtwg.com", name: "Victor Viewer" },
    };

    const info = roleToEmail[role];
    let user = await this.repo.getUserByEmail(info.email);

    if (!user) {
      const newId = `usr-${role.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString().slice(-4)}`;
      await this.repo.createUser({
        id: newId,
        email: info.email,
        fullName: info.name,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      user = await this.repo.getUserByEmail(info.email);
    }

    if (!user) {
      throw new Error(`Failed to resolve dev user for role '${role}'`);
    }

    const rawToken = `twg_dev_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = hashToken(rawToken);
    const sessionId = `sess_${crypto.randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await this.repo.createSession({
      id: sessionId,
      sessionTokenHash: tokenHash,
      userId: user.id,
      role: user.role,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    return {
      sessionId,
      rawToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as AppRole,
      },
    };
  }

  public async authenticate(req: Request): Promise<AuthenticatedUser | null> {
    let token: string | undefined;

    // 1. Check Bearer authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // 2. Fall back to secure session cookie
    if (!token && req.cookies && req.cookies.twg_session) {
      token = req.cookies.twg_session as string;
    }

    if (!token) {
      return null;
    }

    const tokenHash = hashToken(token);
    const session = await this.repo.getSessionByHash(tokenHash);

    if (!session || !session.user || !session.user.isActive) {
      return null;
    }

    // Enforce Session Expiry (24-hour absolute cap)
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.repo.deleteSession(tokenHash);
      return null;
    }

    // Enforce Idle Timeout (4 hours inactivity limit)
    const sessionCreatedMs = new Date(session.createdAt).getTime();
    const idleLimitMs = 4 * 60 * 60 * 1000;
    if (Date.now() - sessionCreatedMs > idleLimitMs) {
      await this.repo.deleteSession(tokenHash);
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role as AppRole,
    };
  }

  public async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.repo.deleteSession(tokenHash);
  }

  public async rotateSessionOnRoleChange(userId: string, newRole: AppRole): Promise<AuthSession> {
    // 1. Fetch user
    const user = await this.repo.getUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 2. Generate new session
    const rawToken = `twg_rotated_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = hashToken(rawToken);
    const sessionId = `sess_rot_${crypto.randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.repo.createSession({
      id: sessionId,
      sessionTokenHash: tokenHash,
      userId: user.id,
      role: newRole,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    return {
      sessionId,
      rawToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: newRole,
      },
    };
  }
}

// Entra ID OIDC Provider Scaffolding (ready for Azure AD tenant configuration)
export class EntraIdAuthProvider implements IAuthProvider {
  public readonly name = "EntraIdAuthProvider";

  constructor(private readonly repo: IEntityRepository = new PostgresEntityRepository()) {}

  public async authenticate(req: Request): Promise<AuthenticatedUser | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    // [VERIFY] Placeholder for MSAL / Entra ID token verification
    return null;
  }

  public async loginDev(_role: AppRole): Promise<AuthSession> {
    throw new Error("Dev login is not supported in EntraIdAuthProvider");
  }

  public async logout(_rawToken: string): Promise<void> {
    // Entra ID token revocation hook
  }
}
