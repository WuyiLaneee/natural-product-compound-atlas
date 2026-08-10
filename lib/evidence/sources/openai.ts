import type {
  EvidenceClaim,
  EvidenceClaimType,
  EvidenceExtractionDocument,
  EvidenceLevel,
  EvidenceSource,
  OpenAICompatibleConfig,
  PatentRelationship,
  SourceResult,
} from "../types";
import {
  EVIDENCE_LEVEL_DEFINITIONS,
  PATENT_RELATIONSHIP_DEFINITIONS,
} from "../types";
import {
  SourceFetchError,
  clampInteger,
  fetchJson,
  makeSourceResult,
  normalizeTitle,
  normalizeWhitespace,
  skippedSourceResult,
  toSourceError,
} from "./common";

type ResponseFormatMode = "json_schema" | "json_object" | "prompt_only";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

interface RawClaim {
  claimType?: unknown;
  summary?: unknown;
  effect?: unknown;
  target?: unknown;
  direction?: unknown;
  evidenceLevel?: unknown;
  modelType?: unknown;
  species?: unknown;
  induction?: unknown;
  intervention?: unknown;
  dose?: unknown;
  endpoints?: unknown;
  patentRelationship?: unknown;
  source?: unknown;
  confidence?: unknown;
}

const CLAIM_TYPES: EvidenceClaimType[] = [
  "efficacy",
  "target",
  "mechanism",
  "safety",
  "pharmacokinetic",
];
const EVIDENCE_LEVELS: EvidenceLevel[] = ["T1", "T2", "T3", "T4", "T5"];
const EVIDENCE_SOURCES: EvidenceSource[] = [
  "pubchem",
  "chembl",
  "europe_pmc",
  "clinical_trials",
  "epo_ops",
];
const PATENT_RELATIONSHIPS: PatentRelationship[] = ["mention", "example", "claim"];
const DIRECTIONS = [
  "increase",
  "decrease",
  "activate",
  "inhibit",
  "bind",
  "mixed",
  "unknown",
] as const;
const MODEL_TYPES = [
  "biochemical",
  "cell",
  "animal",
  "human",
  "computational",
  "other",
] as const;

export const evidenceExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["claims"],
  properties: {
    claims: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "claimType",
          "summary",
          "effect",
          "target",
          "direction",
          "evidenceLevel",
          "modelType",
          "species",
          "induction",
          "intervention",
          "dose",
          "endpoints",
          "patentRelationship",
          "source",
          "confidence",
        ],
        properties: {
          claimType: { type: "string", enum: CLAIM_TYPES },
          summary: { type: "string", minLength: 1, maxLength: 600 },
          effect: { type: ["string", "null"], maxLength: 300 },
          target: { type: ["string", "null"], maxLength: 200 },
          direction: { type: ["string", "null"], enum: [...DIRECTIONS, null] },
          evidenceLevel: { type: "string", enum: EVIDENCE_LEVELS },
          modelType: { type: ["string", "null"], enum: [...MODEL_TYPES, null] },
          species: { type: ["string", "null"], maxLength: 120 },
          induction: { type: ["string", "null"], maxLength: 300 },
          intervention: { type: ["string", "null"], maxLength: 300 },
          dose: { type: ["string", "null"], maxLength: 160 },
          endpoints: {
            type: "array",
            items: { type: "string", minLength: 1, maxLength: 200 },
            maxItems: 20,
          },
          patentRelationship: {
            type: ["string", "null"],
            enum: [...PATENT_RELATIONSHIPS, null],
          },
          source: {
            type: "object",
            additionalProperties: false,
            required: ["source", "sourceId", "sourceUrl", "locator", "excerpt"],
            properties: {
              source: { type: "string", enum: EVIDENCE_SOURCES },
              sourceId: { type: "string", minLength: 1, maxLength: 160 },
              sourceUrl: { type: ["string", "null"], maxLength: 1_000 },
              locator: { type: "string", minLength: 1, maxLength: 240 },
              excerpt: { type: "string", minLength: 8, maxLength: 700 },
            },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

function endpointFor(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

function nullableString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = normalizeWhitespace(value).slice(0, maxLength);
  return normalized || undefined;
}

function contentAsString(
  content: string | Array<{ type?: string; text?: string }> | undefined,
): string | undefined {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return undefined;
  return content
    .map((part) => (part && typeof part === "object" && typeof part.text === "string" ? part.text : ""))
    .join("");
}

function parseJsonContent(value: string): unknown {
  const stripped = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(stripped) as unknown;
}

function quoteIsGrounded(excerpt: string, documentText: string): boolean {
  const normalizedExcerpt = normalizeTitle(excerpt);
  const normalizedDocument = normalizeTitle(documentText);
  if (normalizedExcerpt.length < 8) return false;
  if (normalizedDocument.includes(normalizedExcerpt)) return true;
  // Permit punctuation/spacing normalization while still requiring a substantial
  // exact prefix from the purported quotation.
  return normalizedExcerpt.length >= 60 && normalizedDocument.includes(normalizedExcerpt.slice(0, 60));
}

function validateRawClaim(
  raw: RawClaim,
  documents: Map<string, EvidenceExtractionDocument>,
  modelName: string,
): EvidenceClaim | undefined {
  if (!CLAIM_TYPES.includes(raw.claimType as EvidenceClaimType)) return undefined;
  if (!EVIDENCE_LEVELS.includes(raw.evidenceLevel as EvidenceLevel)) return undefined;
  const summary = nullableString(raw.summary, 600);
  if (!summary || !raw.source || typeof raw.source !== "object") return undefined;
  const sourceObject = raw.source as Record<string, unknown>;
  const source = sourceObject.source;
  const sourceId = nullableString(sourceObject.sourceId, 160);
  const locator = nullableString(sourceObject.locator, 240);
  const excerpt = nullableString(sourceObject.excerpt, 700);
  if (!EVIDENCE_SOURCES.includes(source as EvidenceSource) || !sourceId || !locator || !excerpt) {
    return undefined;
  }
  const document = documents.get(`${source}:${sourceId}`);
  if (!document || !quoteIsGrounded(excerpt, document.text)) return undefined;

  const confidenceValue = typeof raw.confidence === "number" ? raw.confidence : Number(raw.confidence);
  if (!Number.isFinite(confidenceValue)) return undefined;
  const endpoints = Array.isArray(raw.endpoints)
    ? raw.endpoints
        .map((item) => nullableString(item, 200))
        .filter((item): item is string => Boolean(item))
        .slice(0, 20)
    : [];
  const direction = DIRECTIONS.includes(raw.direction as (typeof DIRECTIONS)[number])
    ? (raw.direction as EvidenceClaim["direction"])
    : undefined;
  const modelType = MODEL_TYPES.includes(raw.modelType as (typeof MODEL_TYPES)[number])
    ? (raw.modelType as EvidenceClaim["modelType"])
    : undefined;
  const patentRelationship = PATENT_RELATIONSHIPS.includes(
    raw.patentRelationship as PatentRelationship,
  )
    ? (raw.patentRelationship as PatentRelationship)
    : document.patentRelationship;

  return {
    claimType: raw.claimType as EvidenceClaimType,
    summary,
    effect: nullableString(raw.effect, 300),
    target: nullableString(raw.target, 200),
    direction,
    evidenceLevel: raw.evidenceLevel as EvidenceLevel,
    modelType,
    species: nullableString(raw.species, 120),
    induction: nullableString(raw.induction, 300),
    intervention: nullableString(raw.intervention, 300),
    dose: nullableString(raw.dose, 160),
    endpoints,
    patentRelationship:
      source === "epo_ops" || source === "pubchem" ? patentRelationship : undefined,
    source: {
      source: source as EvidenceSource,
      sourceId,
      sourceUrl: nullableString(sourceObject.sourceUrl, 1_000) ?? document.sourceUrl,
      locator,
      excerpt,
    },
    confidence: Math.min(1, Math.max(0, confidenceValue)),
    reviewStatus: "machine_unreviewed",
    modelName,
  };
}

export function validateEvidenceClaims(
  value: unknown,
  documents: EvidenceExtractionDocument[],
  modelName: string,
): EvidenceClaim[] {
  if (!value || typeof value !== "object") return [];
  const rawClaims = (value as { claims?: unknown }).claims;
  if (!Array.isArray(rawClaims)) return [];
  const documentMap = new Map(
    documents.map((document) => [
      `${document.source}:${document.sourceId}`,
      document,
    ]),
  );
  const seen = new Set<string>();
  const claims: EvidenceClaim[] = [];
  for (const item of rawClaims) {
    if (!item || typeof item !== "object") continue;
    const claim = validateRawClaim(item as RawClaim, documentMap, modelName);
    if (!claim) continue;
    const key = [
      claim.source.source,
      claim.source.sourceId,
      claim.claimType,
      normalizeTitle(claim.summary),
      normalizeTitle(claim.target ?? ""),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    claims.push(claim);
  }
  return claims;
}

function systemPrompt(mode: ResponseFormatMode): string {
  const formatRule =
    mode === "prompt_only"
      ? "Return one valid JSON object only. Do not use Markdown, code fences, comments, or trailing text."
      : "Follow the supplied JSON response format exactly.";
  return [
    "You extract evidence about one chemical compound from source-grounded records.",
    "Do not use outside knowledge. Do not infer a target from a pathway marker alone.",
    "Every claim must quote a short verbatim excerpt from exactly one supplied record and echo that record's source and sourceId.",
    "If the record does not support a claim, omit it. Empty claims are valid.",
    `Evidence levels: ${Object.entries(EVIDENCE_LEVEL_DEFINITIONS)
      .map(([level, definition]) => `${level}: ${definition}`)
      .join(" ")}`,
    `Patent relations: ${Object.entries(PATENT_RELATIONSHIP_DEFINITIONS)
      .map(([relation, definition]) => `${relation}: ${definition}`)
      .join(" ")}`,
    "A clinical-trial registration is not proof of efficacy; describe it as registered or reported only according to the supplied record.",
    formatRule,
  ].join("\n");
}

function userPrompt(compoundName: string, documents: EvidenceExtractionDocument[]): string {
  return JSON.stringify({
    task: "Extract efficacy, target, mechanism, safety, and pharmacokinetic evidence claims for the named compound.",
    compound: compoundName,
    records: documents.map((document) => ({
      source: document.source,
      sourceId: document.sourceId,
      sourceUrl: document.sourceUrl ?? null,
      title: document.title ?? null,
      locator: document.locator,
      knownPatentRelationship: document.patentRelationship ?? null,
      text: document.text,
    })),
  });
}

function requestBody(
  compoundName: string,
  documents: EvidenceExtractionDocument[],
  config: OpenAICompatibleConfig,
  mode: ResponseFormatMode,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt(mode) },
      { role: "user", content: userPrompt(compoundName, documents) },
    ],
  };
  if (mode === "json_schema") {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "compound_evidence_claims",
        strict: true,
        schema: evidenceExtractionJsonSchema,
      },
    };
  } else if (mode === "json_object") {
    body.response_format = { type: "json_object" };
  }
  return body;
}

async function callModel(
  compoundName: string,
  documents: EvidenceExtractionDocument[],
  config: OpenAICompatibleConfig,
  mode: ResponseFormatMode,
): Promise<unknown> {
  const response = await fetchJson<ChatCompletionResponse>(
    endpointFor(config.baseUrl),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody(compoundName, documents, config, mode)),
    },
    config.timeoutMs,
    config.fetchImpl,
  );
  const content = contentAsString(response.choices?.[0]?.message?.content);
  if (!content) {
    throw new SourceFetchError("Model response did not include message content.", {
      code: "missing_model_content",
      retryable: false,
    });
  }
  try {
    return parseJsonContent(content);
  } catch {
    throw new SourceFetchError("Model returned invalid JSON.", {
      code: "invalid_model_json",
      retryable: false,
    });
  }
}

function formatUnsupported(error: unknown): boolean {
  return (
    error instanceof SourceFetchError &&
    (error.httpStatus === 400 || error.httpStatus === 404 || error.httpStatus === 415 || error.httpStatus === 422)
  );
}

async function callWithFormatFallback(
  compoundName: string,
  documents: EvidenceExtractionDocument[],
  config: OpenAICompatibleConfig,
): Promise<unknown> {
  try {
    return await callModel(compoundName, documents, config, "json_schema");
  } catch (schemaError) {
    if (!formatUnsupported(schemaError) && !(schemaError instanceof SourceFetchError && schemaError.code === "invalid_model_json")) {
      throw schemaError;
    }
  }

  try {
    return await callModel(compoundName, documents, config, "json_object");
  } catch (objectError) {
    if (!formatUnsupported(objectError) && !(objectError instanceof SourceFetchError && objectError.code === "invalid_model_json")) {
      throw objectError;
    }
  }

  return callModel(compoundName, documents, config, "prompt_only");
}

function selectDocuments(
  documents: EvidenceExtractionDocument[],
  maxDocuments: number,
  maxInputCharacters: number,
): { documents: EvidenceExtractionDocument[]; truncated: boolean } {
  const selected: EvidenceExtractionDocument[] = [];
  let usedCharacters = 0;
  for (const document of documents) {
    if (selected.length >= maxDocuments || usedCharacters >= maxInputCharacters) break;
    const available = maxInputCharacters - usedCharacters;
    const text = normalizeWhitespace(document.text).slice(0, Math.min(12_000, available));
    if (text.length < 8) continue;
    selected.push({ ...document, text });
    usedCharacters += text.length;
  }
  return {
    documents: selected,
    truncated: selected.length < documents.length,
  };
}

export async function extractEvidenceClaims(
  compoundName: string,
  documents: EvidenceExtractionDocument[],
  config: OpenAICompatibleConfig | undefined,
): Promise<SourceResult<EvidenceClaim>> {
  if (
    !config?.baseUrl?.trim() ||
    !config.apiKey?.trim() ||
    !config.model?.trim()
  ) {
    return skippedSourceResult(
      "openai",
      "missing_credentials",
      "OpenAI-compatible base URL, API key, and model were not configured.",
    );
  }

  const maxDocuments = clampInteger(config.maxDocuments, 50, 1, 100);
  const batchSize = clampInteger(config.batchSize, 10, 1, 25);
  const maxInputCharacters = clampInteger(
    config.maxInputCharacters,
    80_000,
    4_000,
    300_000,
  );
  const selected = selectDocuments(documents, maxDocuments, maxInputCharacters);
  if (selected.documents.length === 0) {
    return makeSourceResult({
      source: "openai",
      records: [],
      totalAvailable: 0,
      truncated: false,
      meta: { model: config.model, documentsProcessed: 0 },
    });
  }

  const claims: EvidenceClaim[] = [];
  const errors: ReturnType<typeof toSourceError>[] = [];
  for (let index = 0; index < selected.documents.length; index += batchSize) {
    const batch = selected.documents.slice(index, index + batchSize);
    try {
      const raw = await callWithFormatFallback(compoundName, batch, config);
      claims.push(...validateEvidenceClaims(raw, batch, config.model));
    } catch (error) {
      errors.push(toSourceError(error, Math.floor(index / batchSize) + 1));
    }
  }

  const seen = new Set<string>();
  const uniqueClaims = claims.filter((claim) => {
    const key = [
      claim.source.source,
      claim.source.sourceId,
      claim.claimType,
      normalizeTitle(claim.summary),
      normalizeTitle(claim.target ?? ""),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (selected.truncated) {
    errors.push({
      code: "model_document_limit_reached",
      message: `${documents.length} source records were available; ${selected.documents.length} were sent to the model.`,
      retryable: false,
    });
  }

  return makeSourceResult({
    source: "openai",
    records: uniqueClaims,
    errors,
    status: errors.length > 0 ? (uniqueClaims.length > 0 ? "partial" : "error") : "success",
    totalAvailable: documents.length,
    truncated: selected.truncated,
    meta: {
      model: config.model,
      documentsProcessed: selected.documents.length,
    },
  });
}
