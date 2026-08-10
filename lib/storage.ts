import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

import { getD1Binding, getDb } from "@/db";
import {
  compoundSourceRecords,
  sourceRecords,
  sourceSyncState,
  type SourceRecord,
} from "@/db/schema";

const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface CachedSourceRecordInput {
  source: string;
  externalId: string;
  recordType?: string;
  title?: string | null;
  abstract?: string | null;
  claimsText?: string | null;
  descriptionText?: string | null;
  sourceUrl?: string | null;
  publicationNumber?: string | null;
  patentFamilyId?: string | null;
  jurisdiction?: string | null;
  language?: string | null;
  publicationDate?: string | null;
  contentHash?: string | null;
  payload?: Record<string, unknown> | null;
  fetchedAt?: number;
  expiresAt?: number | null;
  ttlMs?: number;
}

export interface CachedSourceRecordResult {
  record: SourceRecord;
  isStale: boolean;
}

export async function getCachedSourceRecord(
  source: string,
  externalId: string,
  options: { allowStale?: boolean; now?: number } = {},
): Promise<CachedSourceRecordResult | null> {
  const now = options.now ?? Date.now();
  const freshness = options.allowStale
    ? undefined
    : or(isNull(sourceRecords.expiresAt), gt(sourceRecords.expiresAt, now));

  const [record] = await getDb()
    .select()
    .from(sourceRecords)
    .where(
      and(
        eq(sourceRecords.source, source),
        eq(sourceRecords.externalId, externalId),
        freshness,
      ),
    )
    .limit(1);

  if (!record) return null;

  return {
    record,
    isStale: record.expiresAt !== null && record.expiresAt <= now,
  };
}

export async function upsertCachedSourceRecord(
  input: CachedSourceRecordInput,
): Promise<SourceRecord> {
  const fetchedAt = input.fetchedAt ?? Date.now();
  const expiresAt =
    input.expiresAt === undefined
      ? fetchedAt + (input.ttlMs ?? DEFAULT_CACHE_TTL_MS)
      : input.expiresAt;
  const updatedAt = Date.now();
  const record = {
    source: input.source,
    externalId: input.externalId,
    recordType: input.recordType ?? "patent",
    title: input.title ?? null,
    abstract: input.abstract ?? null,
    claimsText: input.claimsText ?? null,
    descriptionText: input.descriptionText ?? null,
    sourceUrl: input.sourceUrl ?? null,
    publicationNumber: input.publicationNumber ?? null,
    patentFamilyId: input.patentFamilyId ?? null,
    jurisdiction: input.jurisdiction ?? null,
    language: input.language ?? null,
    publicationDate: input.publicationDate ?? null,
    contentHash: input.contentHash ?? null,
    payload: input.payload ?? null,
    fetchedAt,
    expiresAt,
    updatedAt,
  };

  const [saved] = await getDb()
    .insert(sourceRecords)
    .values(record)
    .onConflictDoUpdate({
      target: [sourceRecords.source, sourceRecords.externalId],
      set: record,
    })
    .returning();

  if (!saved) throw new Error("D1 did not return the cached source record.");
  return saved;
}

export async function linkCompoundToSourceRecord(input: {
  compoundId: number;
  sourceRecordId: number;
  matchMethod?: string;
  matchedTerm?: string | null;
  matchedSection?: string | null;
  relevanceScore?: number;
  isPrimary?: boolean;
}) {
  const now = Date.now();
  const link = {
    compoundId: input.compoundId,
    sourceRecordId: input.sourceRecordId,
    matchMethod: input.matchMethod ?? "synonym",
    matchedTerm: input.matchedTerm ?? null,
    matchedSection: input.matchedSection ?? null,
    relevanceScore: input.relevanceScore ?? 0,
    isPrimary: input.isPrimary ?? false,
    lastSeenAt: now,
  };

  const [saved] = await getDb()
    .insert(compoundSourceRecords)
    .values(link)
    .onConflictDoUpdate({
      target: [
        compoundSourceRecords.compoundId,
        compoundSourceRecords.sourceRecordId,
      ],
      set: link,
    })
    .returning();

  return saved;
}

export async function listCachedSourceRecordsForCompound(
  compoundId: number,
  options: { limit?: number; includeExpired?: boolean; now?: number } = {},
) {
  const now = options.now ?? Date.now();
  const freshness = options.includeExpired
    ? undefined
    : or(isNull(sourceRecords.expiresAt), gt(sourceRecords.expiresAt, now));

  return getDb()
    .select({ link: compoundSourceRecords, record: sourceRecords })
    .from(compoundSourceRecords)
    .innerJoin(
      sourceRecords,
      eq(compoundSourceRecords.sourceRecordId, sourceRecords.id),
    )
    .where(and(eq(compoundSourceRecords.compoundId, compoundId), freshness))
    .orderBy(
      desc(compoundSourceRecords.relevanceScore),
      desc(sourceRecords.publicationDate),
    )
    .limit(Math.min(Math.max(options.limit ?? 50, 1), 200));
}

export async function getSourceSyncState(
  source: string,
  scope = "global",
) {
  const [state] = await getDb()
    .select()
    .from(sourceSyncState)
    .where(
      and(eq(sourceSyncState.source, source), eq(sourceSyncState.scope, scope)),
    )
    .limit(1);

  return state ?? null;
}

export async function markSourceSyncStarted(input: {
  source: string;
  scope?: string;
  cursor?: string | null;
  etag?: string | null;
  lastModified?: string | null;
}) {
  const scope = input.scope ?? "global";
  const now = Date.now();
  const values = {
    source: input.source,
    scope,
    status: "running",
    cursor: input.cursor ?? null,
    etag: input.etag ?? null,
    lastModified: input.lastModified ?? null,
    lastStartedAt: now,
    errorMessage: null,
    updatedAt: now,
  };

  const [state] = await getDb()
    .insert(sourceSyncState)
    .values(values)
    .onConflictDoUpdate({
      target: [sourceSyncState.source, sourceSyncState.scope],
      set: values,
    })
    .returning();

  return state;
}

export async function markSourceSyncSucceeded(input: {
  source: string;
  scope?: string;
  cursor?: string | null;
  etag?: string | null;
  lastModified?: string | null;
  recordsSeen?: number;
  recordsUpserted?: number;
  nextSyncAt?: number | null;
}) {
  const scope = input.scope ?? "global";
  const now = Date.now();
  const values = {
    source: input.source,
    scope,
    status: "succeeded",
    cursor: input.cursor ?? null,
    etag: input.etag ?? null,
    lastModified: input.lastModified ?? null,
    recordsSeen: input.recordsSeen ?? 0,
    recordsUpserted: input.recordsUpserted ?? 0,
    lastSucceededAt: now,
    nextSyncAt: input.nextSyncAt ?? null,
    errorMessage: null,
    updatedAt: now,
  };

  const [state] = await getDb()
    .insert(sourceSyncState)
    .values(values)
    .onConflictDoUpdate({
      target: [sourceSyncState.source, sourceSyncState.scope],
      set: values,
    })
    .returning();

  return state;
}

export async function markSourceSyncFailed(input: {
  source: string;
  scope?: string;
  errorMessage: string;
  cursor?: string | null;
  nextSyncAt?: number | null;
}) {
  const scope = input.scope ?? "global";
  const now = Date.now();
  const values = {
    source: input.source,
    scope,
    status: "failed",
    cursor: input.cursor ?? null,
    lastFailedAt: now,
    nextSyncAt: input.nextSyncAt ?? null,
    errorMessage: input.errorMessage.slice(0, 2000),
    updatedAt: now,
  };

  const [state] = await getDb()
    .insert(sourceSyncState)
    .values(values)
    .onConflictDoUpdate({
      target: [sourceSyncState.source, sourceSyncState.scope],
      set: values,
    })
    .returning();

  return state;
}

async function saltedIpHash(ipAddress: string, salt: string): Promise<string> {
  if (!salt) throw new Error("A non-empty rate-limit salt is required.");

  const normalizedIp = ipAddress.trim().toLowerCase();
  const bytes = new TextEncoder().encode(`${salt}\u0000${normalizedIp}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function consumeRateLimit(input: {
  bucketKey: string;
  ipAddress: string;
  salt: string;
  limit: number;
  windowMs: number;
  now?: number;
}): Promise<RateLimitDecision> {
  if (!Number.isInteger(input.limit) || input.limit < 1) {
    throw new Error("Rate-limit `limit` must be a positive integer.");
  }
  if (!Number.isInteger(input.windowMs) || input.windowMs < 1) {
    throw new Error("Rate-limit `windowMs` must be a positive integer.");
  }

  const now = input.now ?? Date.now();
  const windowStart = Math.floor(now / input.windowMs) * input.windowMs;
  const resetAt = windowStart + input.windowMs;
  const subjectHash = await saltedIpHash(input.ipAddress, input.salt);

  const row = await getD1Binding()
    .prepare(
      `INSERT INTO rate_limit_buckets
        (bucket_key, subject_hash, window_start, request_count, expires_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(bucket_key, subject_hash, window_start)
       DO UPDATE SET
         request_count = MIN(rate_limit_buckets.request_count + 1, ?),
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at
       RETURNING request_count`,
    )
    .bind(
      input.bucketKey,
      subjectHash,
      windowStart,
      resetAt,
      now,
      input.limit + 1,
    )
    .first<{ request_count: number }>();

  if (!row) throw new Error("D1 did not return a rate-limit decision.");

  return {
    allowed: row.request_count <= input.limit,
    limit: input.limit,
    remaining: Math.max(input.limit - row.request_count, 0),
    resetAt,
  };
}

export async function clearExpiredRateLimitBuckets(
  now = Date.now(),
): Promise<number> {
  const result = await getD1Binding()
    .prepare("DELETE FROM rate_limit_buckets WHERE expires_at <= ?")
    .bind(now)
    .run();

  return result.meta.changes ?? 0;
}

export async function optimizeDatabase(): Promise<void> {
  await getD1Binding().prepare("PRAGMA optimize").run();
}
