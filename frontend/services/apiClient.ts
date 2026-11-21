const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/** An error answered by the API. `code` is a stable key (SHIFT_WARNINGS, INSUFFICIENT_STOCK, ...). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: string[];

  constructor(message: string, status: number, code: string | null = null, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const readError = async (response: Response, fallback: string): Promise<ApiError> => {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      const message = typeof record.message === "string" && record.message.trim() ? record.message : fallback;
      const code = typeof record.code === "string" ? record.code : null;
      const details = Array.isArray(record.details)
        ? record.details.filter((detail): detail is string => typeof detail === "string")
        : [];
      return new ApiError(message, response.status, code, details);
    }
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return new ApiError(fallback, response.status);
};

type Query = Record<string, string | number | boolean | null | undefined>;

const withQuery = (path: string, query?: Query) => {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

/** Sends a request with the auth cookie. Throws ApiError for any non 2xx answer. */
export const api = async <T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query; fallback?: string } = {}
): Promise<T> => {
  const { method = "GET", body, query, fallback = "Something went wrong. Please try again." } = options;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${withQuery(path, query)}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("The server could not be reached. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    const error = await readError(response, fallback);
    // A session that ended (expired, or the account was deactivated) sends everyone back to sign in.
    if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
      window.dispatchEvent(new CustomEvent("rms:session-ended"));
    }
    throw error;
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

/** SWR fetcher: the key is the path, or [path, query]. */
export const fetcher = <T>(key: string | [string, Query]): Promise<T> =>
  Array.isArray(key) ? api<T>(key[0], { query: key[1] }) : api<T>(key);
