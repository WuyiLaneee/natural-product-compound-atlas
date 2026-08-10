import type {
  EvidenceSource,
  SourceError,
  SourceResult,
  SourceStatus,
} from "../types";

export const DEFAULT_TIMEOUT_MS = 12_000;
export const DEFAULT_USER_AGENT =
  "GinsenosideEvidenceAtlas/0.1 (public scientific-data aggregator)";

export class SourceFetchError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly httpStatus?: number;

  constructor(
    message: string,
    options: { code?: string; retryable?: boolean; httpStatus?: number } = {},
  ) {
    super(message);
    this.name = "SourceFetchError";
    this.code = options.code ?? "fetch_failed";
    this.retryable = options.retryable ?? true;
    this.httpStatus = options.httpStatus;
  }
}

export function clampInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value as number)));
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  // Cloudflare Workers permit this header. Some browser fetch implementations may
  // silently discard it, so X-Client-Name remains as an explicit fallback marker.
  if (!headers.has("User-Agent")) headers.set("User-Agent", DEFAULT_USER_AGENT);
  if (!headers.has("X-Client-Name")) {
    headers.set("X-Client-Name", "GinsenosideEvidenceAtlas");
  }

  try {
    const response = await fetchImpl(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new SourceFetchError(`Request timed out after ${timeoutMs} ms`, {
        code: "timeout",
        retryable: true,
      });
    }
    throw new SourceFetchError(
      error instanceof Error ? error.message : "Network request failed",
      { code: "network_error", retryable: true },
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchWithTimeout(url, init, timeoutMs, fetchImpl);
  const body = await response.text();

  if (!response.ok) {
    const detail = normalizeWhitespace(body).slice(0, 240);
    throw new SourceFetchError(
      `HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
      {
        code: `http_${response.status}`,
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        httpStatus: response.status,
      },
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new SourceFetchError("Source returned invalid JSON", {
      code: "invalid_json",
      retryable: false,
      httpStatus: response.status,
    });
  }
}

export async function fetchText(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchWithTimeout(url, init, timeoutMs, fetchImpl);
  const body = await response.text();
  if (!response.ok) {
    const detail = normalizeWhitespace(body).slice(0, 240);
    throw new SourceFetchError(
      `HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
      {
        code: `http_${response.status}`,
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        httpStatus: response.status,
      },
    );
  }
  return body;
}

export function toSourceError(error: unknown, page?: number): SourceError {
  if (error instanceof SourceFetchError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      httpStatus: error.httpStatus,
      page,
    };
  }
  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Unexpected source error",
    retryable: false,
    page,
  };
}

export function makeSourceResult<T, M = Record<string, unknown>>(options: {
  source: EvidenceSource;
  records?: T[];
  errors?: SourceError[];
  status?: SourceStatus;
  totalAvailable?: number;
  nextCursor?: string;
  truncated?: boolean;
  meta?: M;
}): SourceResult<T, M> {
  const records = options.records ?? [];
  const errors = options.errors ?? [];
  const status =
    options.status ??
    (errors.length > 0 ? (records.length > 0 ? "partial" : "error") : "success");
  return {
    source: options.source,
    status,
    records,
    errors,
    fetchedAt: new Date().toISOString(),
    totalAvailable: options.totalAvailable,
    nextCursor: options.nextCursor,
    truncated: options.truncated ?? false,
    meta: options.meta,
  };
}

export function skippedSourceResult<T, M = Record<string, unknown>>(
  source: EvidenceSource,
  code: string,
  message: string,
): SourceResult<T, M> {
  return makeSourceResult<T, M>({
    source,
    status: "skipped",
    errors: [{ code, message, retryable: false }],
  });
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeDoi(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "");
  return normalized || undefined;
}

export function normalizeTitle(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function stripMarkup(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const withoutTags = value.replace(/<[^>]*>/g, " ");
  return decodeXmlEntities(normalizeWhitespace(withoutTags));
}

export function decodeXmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|amp|apos|gt|lt|quot);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const numeric = entity.slice(hexadecimal ? 2 : 1);
      const codePoint = Number.parseInt(numeric, hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

export function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value ? normalizeWhitespace(value) : "";
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

export function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function encodeBasicCredentials(clientId: string, clientSecret: string): string {
  const bytes = new TextEncoder().encode(`${clientId}:${clientSecret}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
