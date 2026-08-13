"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  findChineseCompoundSuggestions,
  resolveChineseCompoundName,
} from "@/lib/evidence/chinese-compounds";
import {
  findLocalIngredientSuggestions,
} from "@/lib/evidence/local-ingredients";

type Candidate = {
  cid: number;
  title: string;
  iupacName?: string;
  molecularFormula?: string;
  molecularWeight?: number;
  charge?: number;
  covalentUnitCount?: number;
  definedAtomStereoCount?: number;
  undefinedAtomStereoCount?: number;
  inchiKey?: string;
  entityNote?: string;
  structureUrl?: string;
};

type IngredientResult = {
  slug: string;
  name: string;
  type: string;
};

const examples = ["姜黄素", "白藜芦醇", "槲皮素", "咖啡因"] as const;

export function SearchForm({ compact = false, initialValue = "" }: { compact?: boolean; initialValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const ingredientSuggestions = findLocalIngredientSuggestions(query, 6).map((item) => ({
      key: `ingredient:${item.slug}`,
      label: item.identity.name,
      detail: `${item.identity.type} · ${item.identity.subtype}`,
      kind: "ingredient" as const,
    }));
    if (ingredientSuggestions.length >= 6) return ingredientSuggestions;
    const exactMatch = resolveChineseCompoundName(query);
    const chemicalSuggestions = findChineseCompoundSuggestions(query, 6)
      .filter((item) => item !== exactMatch)
      .map((item) => ({
        key: `compound:${item.cid}:${item.labelZh}`,
        label: item.labelZh,
        detail: `${item.englishName}${item.category ? ` · ${item.category}` : ""}`,
        kind: "compound" as const,
      }));
    return [...ingredientSuggestions, ...chemicalSuggestions].slice(0, 6);
  }, [query]);

  async function submit(value = query) {
    const clean = value.trim();
    if (!clean) { setMessage("请输入已收录中文名、英文名、CAS、PubChem CID 或 InChIKey"); return; }
    setSuggestionsOpen(false);
    setSubmittedQuery(clean);
    setLoading(true); setMessage(""); setCandidates([]);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: clean }),
      });
      const data = await response.json() as {
        status?: string;
        error?: string;
        ingredient?: IngredientResult;
        compound?: Candidate;
        candidates?: Candidate[];
        interpretedQuery?: string;
        matchedChineseName?: string;
        warning?: string;
      };
      if (!response.ok) {
        const responseMessage = data.error || "未找到匹配化合物，请检查已收录中文名、英文名、CAS、CID 或 InChIKey";
        throw new Error(responseMessage);
      }
      if (data.status === "ingredient" && data.ingredient) {
        router.push(`/ingredient/${encodeURIComponent(data.ingredient.slug)}?q=${encodeURIComponent(clean)}`);
        return;
      }
      if (data.status === "resolved" && data.compound) {
        router.push(`/compound/${data.compound.cid}?q=${encodeURIComponent(clean)}`);
        return;
      }
      if (data.status === "ambiguous" && data.candidates?.length) {
        setCandidates(data.candidates);
        const interpretation = data.matchedChineseName && data.interpretedQuery
          ? `已将“${clean}”关联为 ${data.interpretedQuery}。`
          : "";
        const degradedNotice = data.warning ? `${data.warning} ` : "";
        setMessage(interpretation + degradedNotice + (data.candidates.length === 1
          ? "PubChem 返回以下化学实体，请核对结构、分子式和 InChIKey 后确认。"
          : `PubChem 返回 ${data.candidates.length} 个可能的化学实体，请根据结构、分子式和 InChIKey 选择。`));
      } else {
        setMessage(data.error || "未在公开化合物数据中找到匹配项");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检索失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) { event.preventDefault(); void submit(); }

  return (
    <div className={`search-module${compact ? " compact" : ""}`}>
      <form className="search-box" onSubmit={onSubmit} role="search">
        <label className="sr-only" htmlFor={compact ? "compound-search-compact" : "compound-search"}>检索天然产物或小分子化合物</label>
        <span className="search-icon" aria-hidden="true" />
        <input
          id={compact ? "compound-search-compact" : "compound-search"}
          value={query}
          onFocus={() => setSuggestionsOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setSuggestionsOpen(true); setCandidates([]); setMessage(""); }}
          placeholder="输入中文/英文名、CAS、PubChem CID 或 InChIKey，如：姜黄素"
          autoComplete="off"
        />
        <button type="submit" disabled={loading}>{loading ? "正在解析…" : "开始检索"}<span>→</span></button>
      </form>
      {suggestionsOpen && suggestions.length > 0 && (
        <div className="search-suggestions" role="listbox" aria-label="检索建议">
          {suggestions.map((item) => (
            <button key={item.key} type="button" onClick={() => { setQuery(item.label); setSuggestionsOpen(false); void submit(item.label); }}>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
      )}
      {!compact && <div className="example-chips"><span>中文快捷入口：</span>{examples.map((item) => <button key={item} type="button" onClick={() => { setQuery(item); void submit(item); }}>{item}</button>)}</div>}
      {message && <p className="search-message" role="status">{message}</p>}
      {candidates.length > 0 && (
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <button key={candidate.cid} className="candidate-card" onClick={() => router.push(`/compound/${candidate.cid}?q=${encodeURIComponent(submittedQuery || query)}`)}>
              {candidate.structureUrl && <img src={candidate.structureUrl} alt={`${candidate.title} 二维结构`} />}
              <span>
                <strong>{candidate.title}</strong>
                {candidate.iupacName && candidate.iupacName !== candidate.title && <small className="candidate-iupac">IUPAC · {candidate.iupacName}</small>}
                <small>
                  CID {candidate.cid} · {candidate.molecularFormula || "分子式待获取"}
                  {candidate.charge !== undefined ? ` · 净电荷 ${candidate.charge}` : ""}
                  {candidate.covalentUnitCount !== undefined ? ` · ${candidate.covalentUnitCount} 个共价单元` : ""}
                </small>
                <code>{candidate.inchiKey || "InChIKey 待获取"}</code>
                {candidate.entityNote && <small className="candidate-entity-note">实体范围提示：{candidate.entityNote}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
