import { Request, Response } from "express";

export type AppRole =
  | "Executive"
  | "Sales Lead"
  | "Project Manager"
  | "Designer"
  | "Finance"
  | "Admin"
  | "Viewer";

export const ALL_ROLES: AppRole[] = [
  "Executive",
  "Sales Lead",
  "Project Manager",
  "Designer",
  "Finance",
  "Admin",
  "Viewer",
];

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}

export interface AuthSession {
  sessionId: string;
  rawToken: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

export interface IAuthProvider {
  readonly name: string;
  authenticate(req: Request): Promise<AuthenticatedUser | null>;
  loginDev(role: AppRole): Promise<AuthSession>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}
