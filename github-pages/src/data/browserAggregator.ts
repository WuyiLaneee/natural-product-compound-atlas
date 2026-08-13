export {
  aggregateBrowserCompoundEvidence,
  resolveBrowserCompound,
  type BrowserAggregateOptions,
  type BrowserCompoundCandidate,
  type BrowserCompoundPayload,
  type BrowserCompoundResolution,
  type BrowserResolveOptions,
} from "../../../lib/evidence/browser-aggregate";

export {
  CHINESE_COMPOUND_ENTRIES,
  findChineseCompoundSuggestions,
  resolveChineseCompoundName,
} from "../../../lib/evidence/chinese-compounds";

export {
  LOCAL_INGREDIENT_DATABASE_NAME,
  findLocalIngredientSuggestions,
  getLocalIngredientBySlug,
  resolveLocalIngredient,
  type LocalIngredientRecord,
} from "../../../lib/evidence/local-ingredients";
