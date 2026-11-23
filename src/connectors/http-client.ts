export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

export interface SanitizedHttpErrorDetails {
  status?: number;
  statusText?: string;
  url: string;
  message: string;
  rateLimited: boolean;
  retryAfterSeconds?: number;
}

export class SanitizedHttpError extends Error {
  public readonly details: SanitizedHttpErrorDetails;

  constructor(message: string, details: SanitizedHttpErrorDetails) {
    super(message);
    this.name = "SanitizedHttpError";
    this.details = details;
  }
}

export function sanitizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    for (const [key] of parsed.searchParams) {
      if (/token|secret|key|auth|bearer|password/i.test(key)) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/(token|secret|key|password)=[^&]*/gi, "$1=[REDACTED]");
  }
}

export function redactSensitiveObject(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveObject);

  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (/token|secret|password|credential|client_secret|authorization/i.test(key)) {
      clean[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      clean[key] = redactSensitiveObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export async function safeFetchWithRetry(
  url: string,
  options: RequestOptions = {},
): Promise<{ status: number; ok: boolean; data: unknown; headers: Headers }> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxRetries = options.retries ?? 2;
  const baseBackoff = options.backoffMs ?? 500;

  let lastError: Error | null = null;
  const cleanUrl = sanitizeUrl(url);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      // Handle 429 Too Many Requests or 503 Service Unavailable
      if (response.status === 429 || response.status === 503) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1;

        if (attempt < maxRetries) {
          const waitTime = Math.max(retryAfterSeconds * 1000, baseBackoff * Math.pow(2, attempt));
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        throw new SanitizedHttpError(`Rate limit exceeded (${response.status}) on ${cleanUrl}`, {
          status: response.status,
          statusText: response.statusText,
          url: cleanUrl,
          message: `Provider rate limit exceeded. Retry after ${retryAfterSeconds}s`,
          rateLimited: true,
          retryAfterSeconds,
        });
      }

      let parsedData: unknown = null;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          parsedData = await response.json();
        } catch {
          parsedData = null;
        }
      } else {
        parsedData = await response.text();
      }

      if (!response.ok) {
        throw new SanitizedHttpError(`HTTP ${response.status} from ${cleanUrl}`, {
          status: response.status,
          statusText: response.statusText,
          url: cleanUrl,
          message: typeof parsedData === "object" && parsedData !== null
            ? JSON.stringify(redactSensitiveObject(parsedData))
            : String(parsedData || response.statusText),
          rateLimited: false,
        });
      }

      return {
        status: response.status,
        ok: response.ok,
        data: parsedData,
        headers: response.headers,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);

      if (err instanceof SanitizedHttpError) {
        throw err;
      }

      const isAbort = (err as Error)?.name === "AbortError";
      const errMsg = isAbort
        ? `Request timed out after ${timeoutMs}ms on ${cleanUrl}`
        : (err as Error)?.message || "Network request failed";

      lastError = new SanitizedHttpError(errMsg, {
        url: cleanUrl,
        message: errMsg,
        rateLimited: false,
      });

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, baseBackoff * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new Error(`Request failed after ${maxRetries} retries`);
}
