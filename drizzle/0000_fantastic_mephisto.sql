CREATE TABLE `aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compound_id` integer NOT NULL,
	`alias` text NOT NULL,
	`normalized_alias` text NOT NULL,
	`alias_type` text DEFAULT 'synonym' NOT NULL,
	`language` text,
	`source` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`compound_id`) REFERENCES `compounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_aliases_compound_normalized` ON `aliases` (`compound_id`,`normalized_alias`);--> statement-breakpoint
CREATE INDEX `idx_aliases_normalized_alias` ON `aliases` (`normalized_alias`);--> statement-breakpoint
CREATE INDEX `idx_aliases_compound_id` ON `aliases` (`compound_id`);--> statement-breakpoint
CREATE TABLE `bioactivities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fingerprint` text NOT NULL,
	`compound_id` integer NOT NULL,
	`source_record_id` integer NOT NULL,
	`target_name` text,
	`normalized_target` text,
	`target_identifier` text,
	`efficacy` text,
	`relation` text,
	`activity_type` text,
	`activity_value` real,
	`activity_unit` text,
	`organism` text,
	`model_system` text,
	`assay_description` text,
	`evidence_level` text DEFAULT 'reported' NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`compound_id`) REFERENCES `compounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_record_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_bioactivities_fingerprint` ON `bioactivities` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_bioactivities_compound_target` ON `bioactivities` (`compound_id`,`normalized_target`);--> statement-breakpoint
CREATE INDEX `idx_bioactivities_source_record` ON `bioactivities` (`source_record_id`);--> statement-breakpoint
CREATE INDEX `idx_bioactivities_target_identifier` ON `bioactivities` (`target_identifier`);--> statement-breakpoint
CREATE TABLE `compound_source_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`compound_id` integer NOT NULL,
	`source_record_id` integer NOT NULL,
	`match_method` text DEFAULT 'synonym' NOT NULL,
	`matched_term` text,
	`matched_section` text,
	`relevance_score` real DEFAULT 0 NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`compound_id`) REFERENCES `compounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_record_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_compound_source_records_pair` ON `compound_source_records` (`compound_id`,`source_record_id`);--> statement-breakpoint
CREATE INDEX `idx_compound_source_records_rank` ON `compound_source_records` (`compound_id`,`relevance_score`);--> statement-breakpoint
CREATE INDEX `idx_compound_source_records_source_record` ON `compound_source_records` (`source_record_id`);--> statement-breakpoint
CREATE TABLE `compounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`canonical_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`chinese_name` text,
	`english_name` text,
	`pubchem_cid` integer,
	`cas_number` text,
	`inchi_key` text,
	`canonical_smiles` text,
	`molecular_formula` text,
	`molecular_weight` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_compounds_normalized_name` ON `compounds` (`normalized_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_compounds_pubchem_cid` ON `compounds` (`pubchem_cid`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_compounds_cas_number` ON `compounds` (`cas_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_compounds_inchi_key` ON `compounds` (`inchi_key`);--> statement-breakpoint
CREATE TABLE `evidence_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fingerprint` text NOT NULL,
	`compound_id` integer NOT NULL,
	`source_record_id` integer NOT NULL,
	`bioactivity_id` integer,
	`claim_type` text NOT NULL,
	`statement` text NOT NULL,
	`evidence_excerpt` text,
	`section` text,
	`location` text,
	`target_name` text,
	`normalized_target` text,
	`efficacy` text,
	`model_system` text,
	`evidence_grade` text DEFAULT 'mention' NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	`is_reviewed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`compound_id`) REFERENCES `compounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_record_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bioactivity_id`) REFERENCES `bioactivities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_evidence_claims_fingerprint` ON `evidence_claims` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_evidence_claims_compound_type` ON `evidence_claims` (`compound_id`,`claim_type`);--> statement-breakpoint
CREATE INDEX `idx_evidence_claims_source_record` ON `evidence_claims` (`source_record_id`);--> statement-breakpoint
CREATE INDEX `idx_evidence_claims_compound_target` ON `evidence_claims` (`compound_id`,`normalized_target`);--> statement-breakpoint
CREATE INDEX `idx_evidence_claims_review_queue` ON `evidence_claims` (`is_reviewed`,`evidence_grade`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_key` text NOT NULL,
	`subject_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_rate_limit_bucket_subject_window` ON `rate_limit_buckets` (`bucket_key`,`subject_hash`,`window_start`);--> statement-breakpoint
CREATE INDEX `idx_rate_limit_buckets_expires_at` ON `rate_limit_buckets` (`expires_at`);--> statement-breakpoint
CREATE TABLE `source_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`record_type` text DEFAULT 'patent' NOT NULL,
	`title` text,
	`abstract` text,
	`claims_text` text,
	`description_text` text,
	`source_url` text,
	`publication_number` text,
	`patent_family_id` text,
	`jurisdiction` text,
	`language` text,
	`publication_date` text,
	`content_hash` text,
	`payload_json` text,
	`fetched_at` integer NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_source_records_source_external` ON `source_records` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_source_records_source_expiry` ON `source_records` (`source`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_source_records_publication_number` ON `source_records` (`publication_number`);--> statement-breakpoint
CREATE INDEX `idx_source_records_patent_family` ON `source_records` (`patent_family_id`);--> statement-breakpoint
CREATE TABLE `source_sync_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`cursor` text,
	`etag` text,
	`last_modified` text,
	`records_seen` integer DEFAULT 0 NOT NULL,
	`records_upserted` integer DEFAULT 0 NOT NULL,
	`last_started_at` integer,
	`last_succeeded_at` integer,
	`last_failed_at` integer,
	`next_sync_at` integer,
	`error_message` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_source_sync_state_source_scope` ON `source_sync_state` (`source`,`scope`);--> statement-breakpoint
CREATE INDEX `idx_source_sync_state_due` ON `source_sync_state` (`status`,`next_sync_at`);--> statement-breakpoint
PRAGMA optimize;
