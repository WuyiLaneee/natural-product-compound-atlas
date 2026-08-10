import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const nowMs = sql`(unixepoch() * 1000)`;

export const compounds = sqliteTable(
  "compounds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    canonicalName: text("canonical_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    chineseName: text("chinese_name"),
    englishName: text("english_name"),
    pubchemCid: integer("pubchem_cid"),
    casNumber: text("cas_number"),
    inchiKey: text("inchi_key"),
    canonicalSmiles: text("canonical_smiles"),
    molecularFormula: text("molecular_formula"),
    molecularWeight: real("molecular_weight"),
    createdAt: integer("created_at").notNull().default(nowMs),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_compounds_normalized_name").on(table.normalizedName),
    uniqueIndex("uq_compounds_pubchem_cid").on(table.pubchemCid),
    uniqueIndex("uq_compounds_cas_number").on(table.casNumber),
    uniqueIndex("uq_compounds_inchi_key").on(table.inchiKey),
  ],
);

export const aliases = sqliteTable(
  "aliases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    compoundId: integer("compound_id")
      .notNull()
      .references(() => compounds.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    aliasType: text("alias_type").notNull().default("synonym"),
    language: text("language"),
    source: text("source"),
    createdAt: integer("created_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_aliases_compound_normalized").on(
      table.compoundId,
      table.normalizedAlias,
    ),
    index("idx_aliases_normalized_alias").on(table.normalizedAlias),
    index("idx_aliases_compound_id").on(table.compoundId),
  ],
);

export const sourceRecords = sqliteTable(
  "source_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    recordType: text("record_type").notNull().default("patent"),
    title: text("title"),
    abstract: text("abstract"),
    claimsText: text("claims_text"),
    descriptionText: text("description_text"),
    sourceUrl: text("source_url"),
    publicationNumber: text("publication_number"),
    patentFamilyId: text("patent_family_id"),
    jurisdiction: text("jurisdiction"),
    language: text("language"),
    publicationDate: text("publication_date"),
    contentHash: text("content_hash"),
    payload: text("payload_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    fetchedAt: integer("fetched_at").notNull(),
    expiresAt: integer("expires_at"),
    createdAt: integer("created_at").notNull().default(nowMs),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_source_records_source_external").on(
      table.source,
      table.externalId,
    ),
    index("idx_source_records_source_expiry").on(
      table.source,
      table.expiresAt,
    ),
    index("idx_source_records_publication_number").on(table.publicationNumber),
    index("idx_source_records_patent_family").on(table.patentFamilyId),
  ],
);

export const compoundSourceRecords = sqliteTable(
  "compound_source_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    compoundId: integer("compound_id")
      .notNull()
      .references(() => compounds.id, { onDelete: "cascade" }),
    sourceRecordId: integer("source_record_id")
      .notNull()
      .references(() => sourceRecords.id, { onDelete: "cascade" }),
    matchMethod: text("match_method").notNull().default("synonym"),
    matchedTerm: text("matched_term"),
    matchedSection: text("matched_section"),
    relevanceScore: real("relevance_score").notNull().default(0),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
    firstSeenAt: integer("first_seen_at").notNull().default(nowMs),
    lastSeenAt: integer("last_seen_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_compound_source_records_pair").on(
      table.compoundId,
      table.sourceRecordId,
    ),
    index("idx_compound_source_records_rank").on(
      table.compoundId,
      table.relevanceScore,
    ),
    index("idx_compound_source_records_source_record").on(
      table.sourceRecordId,
    ),
  ],
);

export const bioactivities = sqliteTable(
  "bioactivities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fingerprint: text("fingerprint").notNull(),
    compoundId: integer("compound_id")
      .notNull()
      .references(() => compounds.id, { onDelete: "cascade" }),
    sourceRecordId: integer("source_record_id")
      .notNull()
      .references(() => sourceRecords.id, { onDelete: "cascade" }),
    targetName: text("target_name"),
    normalizedTarget: text("normalized_target"),
    targetIdentifier: text("target_identifier"),
    efficacy: text("efficacy"),
    relation: text("relation"),
    activityType: text("activity_type"),
    activityValue: real("activity_value"),
    activityUnit: text("activity_unit"),
    organism: text("organism"),
    modelSystem: text("model_system"),
    assayDescription: text("assay_description"),
    evidenceLevel: text("evidence_level").notNull().default("reported"),
    confidence: real("confidence").notNull().default(0.5),
    createdAt: integer("created_at").notNull().default(nowMs),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_bioactivities_fingerprint").on(table.fingerprint),
    index("idx_bioactivities_compound_target").on(
      table.compoundId,
      table.normalizedTarget,
    ),
    index("idx_bioactivities_source_record").on(table.sourceRecordId),
    index("idx_bioactivities_target_identifier").on(table.targetIdentifier),
  ],
);

export const evidenceClaims = sqliteTable(
  "evidence_claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fingerprint: text("fingerprint").notNull(),
    compoundId: integer("compound_id")
      .notNull()
      .references(() => compounds.id, { onDelete: "cascade" }),
    sourceRecordId: integer("source_record_id")
      .notNull()
      .references(() => sourceRecords.id, { onDelete: "cascade" }),
    bioactivityId: integer("bioactivity_id").references(() => bioactivities.id, {
      onDelete: "set null",
    }),
    claimType: text("claim_type").notNull(),
    statement: text("statement").notNull(),
    evidenceExcerpt: text("evidence_excerpt"),
    section: text("section"),
    location: text("location"),
    targetName: text("target_name"),
    normalizedTarget: text("normalized_target"),
    efficacy: text("efficacy"),
    modelSystem: text("model_system"),
    evidenceGrade: text("evidence_grade").notNull().default("mention"),
    confidence: real("confidence").notNull().default(0.5),
    isReviewed: integer("is_reviewed", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull().default(nowMs),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_evidence_claims_fingerprint").on(table.fingerprint),
    index("idx_evidence_claims_compound_type").on(
      table.compoundId,
      table.claimType,
    ),
    index("idx_evidence_claims_source_record").on(table.sourceRecordId),
    index("idx_evidence_claims_compound_target").on(
      table.compoundId,
      table.normalizedTarget,
    ),
    index("idx_evidence_claims_review_queue").on(
      table.isReviewed,
      table.evidenceGrade,
    ),
  ],
);

export const sourceSyncState = sqliteTable(
  "source_sync_state",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(),
    scope: text("scope").notNull().default("global"),
    status: text("status").notNull().default("idle"),
    cursor: text("cursor"),
    etag: text("etag"),
    lastModified: text("last_modified"),
    recordsSeen: integer("records_seen").notNull().default(0),
    recordsUpserted: integer("records_upserted").notNull().default(0),
    lastStartedAt: integer("last_started_at"),
    lastSucceededAt: integer("last_succeeded_at"),
    lastFailedAt: integer("last_failed_at"),
    nextSyncAt: integer("next_sync_at"),
    errorMessage: text("error_message"),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_source_sync_state_source_scope").on(
      table.source,
      table.scope,
    ),
    index("idx_source_sync_state_due").on(table.status, table.nextSyncAt),
  ],
);

export const rateLimitBuckets = sqliteTable(
  "rate_limit_buckets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bucketKey: text("bucket_key").notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStart: integer("window_start").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (table) => [
    uniqueIndex("uq_rate_limit_bucket_subject_window").on(
      table.bucketKey,
      table.subjectHash,
      table.windowStart,
    ),
    index("idx_rate_limit_buckets_expires_at").on(table.expiresAt),
  ],
);

export type Compound = typeof compounds.$inferSelect;
export type NewCompound = typeof compounds.$inferInsert;
export type SourceRecord = typeof sourceRecords.$inferSelect;
export type NewSourceRecord = typeof sourceRecords.$inferInsert;
export type Bioactivity = typeof bioactivities.$inferSelect;
export type EvidenceClaim = typeof evidenceClaims.$inferSelect;
