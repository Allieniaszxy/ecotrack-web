import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

/**
 * Calls the EcoTrack API and returns the parsed JSON body.
 * Throws ApiError with the server's message for any non-2xx response, and a
 * friendly ApiError(status 0) when the server cannot be reached.
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      cache: "no-store",
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Cannot reach the EcoTrack server. Check that the API is running.",
      0,
    );
  }

  let json: unknown = null;

  try {
    json = await response.json();
  } catch {
    // Non-JSON body; handled below.
  }

  const payload = (json ?? {}) as { message?: string; success?: boolean };

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.message || `Request failed (HTTP ${response.status}).`,
      response.status,
    );
  }

  return payload as T;
}

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  return error instanceof Error && error.message ? error.message : fallback;
}
