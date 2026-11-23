import { Request, Response, NextFunction } from "express";
import { AppRole, IAuthProvider } from "./types";
import { DevAuthProvider } from "./provider";

export function assertProductionAuthSafety(): void {
  const isProd = process.env.NODE_ENV === "production";
  const devAuthEnabled = process.env.AUTH_DEV_MODE === "true";
  if (isProd && devAuthEnabled) {
    throw new Error(
      "FATAL SECURITY VIOLATION: AUTH_DEV_MODE must NOT be enabled in production environments!"
    );
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie("twg_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie("twg_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function createAuthMiddleware(authProvider: IAuthProvider = new DevAuthProvider()) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authProvider.authenticate(req);
      if (user) {
        req.user = user;
      }
      next();
    } catch {
      // If authentication token is invalid or lookup fails, treat as unauthenticated
      next();
    }
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
      message: "You must provide a valid session cookie or Bearer token to access this resource.",
    });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Access forbidden: Insufficient role permissions",
        code: "FORBIDDEN",
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
      return;
    }

    next();
  };
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const isMutating = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method.toUpperCase());
  if (!isMutating) {
    return next();
  }

  // If request uses Bearer token, CSRF is not applicable
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }

  // If request uses cookie authentication, verify custom CSRF / AJAX header
  const hasCookie = Boolean(req.cookies && req.cookies.twg_session);
  if (hasCookie) {
    const customHeader = req.headers["x-requested-with"] || req.headers["x-csrf-token"];
    if (!customHeader) {
      res.status(403).json({
        error: "CSRF verification failed: Missing required X-Requested-With or X-CSRF-Token header on cookie-authenticated mutation",
        code: "CSRF_FAILED",
      });
      return;
    }
  }

  next();
}
