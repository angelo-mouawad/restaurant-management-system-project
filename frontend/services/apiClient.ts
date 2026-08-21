const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      const message = (body as Record<string, unknown>).message;
      if (typeof message === "string" && message.trim() !== "") {
        return message;
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
};

export const apiFetch = async <T>(
  path: string,
  fallbackError: string,
  init?: RequestInit
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new ApiError("The server could not be reached. Please try again.", 0);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response, fallbackError), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return undefined as T;
  }
};
