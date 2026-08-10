"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  cid: number;
  title: string;
  molecularFormula?: string;
  inchiKey?: string;
  structureUrl?: string;
};

const examples = ["人参皂苷 Rg1", "人参皂苷 F2", "20(S)-Rg3", "Compound K"];

export function SearchForm({ compact = false, initialValue = "" }: { compact?: boolean; initialValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return examples.filter((item) => item.toLowerCase().includes(needle) && item !== query).slice(0, 4);
  }, [query]);

  async function submit(value = query) {
    const clean = value.trim();
    if (!clean) { setMessage("请输入人参皂苷名称、CAS 或 PubChem CID"); return; }
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
        compound?: Candidate;
        candidates?: Candidate[];
      };
      if (!response.ok) throw new Error(data.error || "检索服务暂时不可用");
      if (data.status === "resolved" && data.compound) {
        router.push(`/compound/${data.compound.cid}?q=${encodeURIComponent(clean)}`);
        return;
      }
      if (data.status === "ambiguous" && data.candidates?.length) {
        setCandidates(data.candidates);
        setMessage("发现多个可能的化学实体，请根据结构和 InChIKey 选择。 ");
      } else {
        setMessage(data.error || "未在人参皂苷目录与 PubChem 中找到匹配项");
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
        <label className="sr-only" htmlFor={compact ? "compound-search-compact" : "compound-search"}>检索人参皂苷单体</label>
        <span className="search-icon" aria-hidden="true" />
        <input
          id={compact ? "compound-search-compact" : "compound-search"}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setCandidates([]); setMessage(""); }}
          placeholder="输入名称、CAS 或 PubChem CID，如：人参皂苷 F2"
          autoComplete="off"
        />
        <button type="submit" disabled={loading}>{loading ? "正在解析…" : "开始检索"}<span>→</span></button>
      </form>
      {suggestions.length > 0 && (
        <div className="search-suggestions" role="listbox" aria-label="检索建议">
          {suggestions.map((item) => <button key={item} onClick={() => { setQuery(item); void submit(item); }}>{item}</button>)}
        </div>
      )}
      {!compact && <div className="example-chips"><span>试试：</span>{examples.map((item) => <button key={item} onClick={() => { setQuery(item); void submit(item); }}>{item}</button>)}</div>}
      {message && <p className="search-message" role="status">{message}</p>}
      {candidates.length > 0 && (
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <button key={candidate.cid} className="candidate-card" onClick={() => router.push(`/compound/${candidate.cid}?q=${encodeURIComponent(query)}`)}>
              {candidate.structureUrl && <img src={candidate.structureUrl} alt={`${candidate.title} 二维结构`} />}
              <span><strong>{candidate.title}</strong><small>CID {candidate.cid} · {candidate.molecularFormula || "分子式待获取"}</small><code>{candidate.inchiKey || "InChIKey 待获取"}</code></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
