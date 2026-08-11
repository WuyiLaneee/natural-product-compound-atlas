import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  findCatalogMatches,
  GINSENOSIDE_CATALOG,
  GINSENOSIDE_CATEGORIES,
  type GinsenosideCatalogEntry,
  type GinsenosideCategory,
} from "../../lib/catalog";
import {
  aggregateBrowserCompoundEvidence,
  type BrowserCompoundPayload,
} from "./data/browserAggregator";

type Route = { page: "home" } | { page: "compound"; cid: number; query: string };
type Tab = "overview" | "effects" | "targets" | "literature" | "trials" | "patents";

const categoryOrder: GinsenosideCategory[] = ["protopanaxadiol", "protopanaxatriol", "ocotillol", "oleanane"];
const examples = ["人参皂苷 Rg1", "人参皂苷 F2", "20(S)-Rg3", "Compound K"];
const tabs: Array<[Tab, string]> = [
  ["overview", "数据总览"], ["effects", "功效研究"], ["targets", "靶点研究"],
  ["literature", "学术论文"], ["trials", "临床研究"], ["patents", "专利信息"],
];

function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathname, search = ""] = raw.split("?");
  const match = pathname.match(/^\/compound\/(\d+)\/?$/);
  if (match) return { page: "compound", cid: Number(match[1]), query: new URLSearchParams(search).get("q") || "" };
  return { page: "home" };
}

function navigateToCompound(entry: GinsenosideCatalogEntry, query = entry.displayNameZh) {
  if (!entry.pubchemCid) return;
  window.location.hash = `/compound/${entry.pubchemCid}?q=${encodeURIComponent(query)}`;
}

function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route.page === "compound" ? <CompoundPage key={route.cid} cid={route.cid} query={route.query} /> : <HomePage />;
}

function Header({ compact = false }: { compact?: boolean }) {
  return <header className={`site-header${compact ? " compact" : ""}`}>
    <a href="#/" className="brand-lockup" aria-label="返回首页">
      <img className="giant-logo" src={asset("brand/giant-biogene.png")} alt="巨子生物" />
      <span className="brand-cross">×</span>
      <img className="nwu-logo" src={asset("brand/nwu.png")} alt="西北大学" />
      <span className="brand-divider" />
      <span className="product-name">人参皂苷<br />科研平台</span>
    </a>
    <div className="header-edition" title="当前为 GitHub Pages 公开数据入口">
      <span className="edition-dot" />
      <span><small>PUBLIC DATA EDITION</small><strong>公开数据入口</strong></span>
    </div>
  </header>;
}

function HomePage() {
  const [filter, setFilter] = useState<GinsenosideCategory | "all">("all");
  const visible = filter === "all" ? GINSENOSIDE_CATALOG : GINSENOSIDE_CATALOG.filter((item) => item.category === filter);
  return <main>
    <Header />
    <section className="hero-shell">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow"><span /> GIANT BIOGENE · GINSENOSIDE RESEARCH</p>
        <h1>从人参皂苷单体出发，<br />探索科研与创新价值</h1>
        <p className="hero-lead">检索化合物身份、功效研究、作用靶点、论文与临床试验，快速连接全球公开科研信息。</p>
        <SearchModule />
        <div className="public-scope"><i />当前入口直接连接公开数据库；EPO 深度专利与智能解析将在腾讯云正式入口开放。</div>
      </div>
      <div className="molecule-orbit" aria-hidden="true">
        <div className="orbit orbit-a"><i /><i /><i /></div><div className="orbit orbit-b"><i /><i /></div>
        <div className="orbit-core"><strong>C<sub>42</sub>H<sub>72</sub>O<sub>14</sub></strong><span>GINSENOSIDE</span></div>
      </div>
    </section>

    <section className="source-strip" aria-label="公开数据源">
      <div><strong>PubChem</strong><span>化合物身份</span><em>实时</em></div>
      <div><strong>ChEMBL</strong><span>活性与靶点</span><em>实时</em></div>
      <div><strong>PubMed / Europe PMC</strong><span>论文与功效</span><em>实时</em></div>
      <div><strong>ClinicalTrials.gov</strong><span>临床研究</span><em>实时</em></div>
    </section>

    <section className="catalog-section" id="catalog">
      <header className="section-heading">
        <div><p className="eyebrow dark"><span /> CURATED COMPOUND DIRECTORY</p><h2>人参皂苷单体目录</h2></div>
        <p>收录 30 个常用单体及明确的 20(S)/20(R) 异构体，可按类型浏览或直接检索。</p>
      </header>
      <div className="catalog-filters" role="group" aria-label="按结构类型筛选">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部 <span>30</span></button>
        {categoryOrder.map((key) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{GINSENOSIDE_CATEGORIES[key].labelZh} <span>{GINSENOSIDE_CATALOG.filter((x) => x.category === key).length}</span></button>)}
      </div>
      <div className="catalog-grid">
        {visible.map((entry) => <button className="compound-card" key={entry.slug} onClick={() => navigateToCompound(entry)} disabled={!entry.pubchemCid}>
          <span className="compound-index">{String(GINSENOSIDE_CATALOG.indexOf(entry) + 1).padStart(2, "0")}</span>
          <span className="compound-names"><strong>{entry.displayNameZh}</strong><small>{entry.displayNameEn}</small></span>
          <span className="compound-cid">CID {entry.pubchemCid || "待确认"}</span><span className="card-arrow">→</span>
        </button>)}
      </div>
    </section>
    <Footer />
  </main>;
}

function SearchModule({ compact = false, initialValue = "" }: { compact?: boolean; initialValue?: string }) {
  const [query, setQuery] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<readonly GinsenosideCatalogEntry[]>([]);
  const suggestions = useMemo(() => query.trim() ? findCatalogMatches(query, 6) : [], [query]);

  function submit(value = query) {
    const clean = value.trim();
    if (!clean) { setMessage("请输入名称、CAS、PubChem CID 或 InChIKey"); return; }
    const matches = findCatalogMatches(clean, 12);
    if (matches.length === 1) { navigateToCompound(matches[0], clean); return; }
    if (matches.length > 1) { setCandidates(matches); setMessage("发现多个可能的化学实体，请选择具体单体或立体异构体。"); return; }
    setCandidates([]); setMessage("当前公开版支持下方 30 个人参皂苷单体，请从目录中选择。");
  }

  return <div className={`search-module${compact ? " compact" : ""}`}>
    <form className="search-box" role="search" onSubmit={(event: FormEvent) => { event.preventDefault(); submit(); }}>
      <label className="sr-only" htmlFor={compact ? "search-compact" : "search-main"}>检索人参皂苷单体</label>
      <span className="search-icon" aria-hidden="true" />
      <input id={compact ? "search-compact" : "search-main"} value={query} onChange={(e) => { setQuery(e.target.value); setCandidates([]); setMessage(""); }} placeholder="输入名称、CAS 或 PubChem CID，如：人参皂苷 F2" autoComplete="off" />
      <button type="submit">开始检索 <span>→</span></button>
    </form>
    {query && suggestions.length > 0 && candidates.length === 0 && <div className="search-suggestions" role="listbox">{suggestions.map((item) => <button key={item.slug} onClick={() => navigateToCompound(item, query)}><strong>{item.displayNameZh}</strong><span>{item.displayNameEn} · CID {item.pubchemCid}</span></button>)}</div>}
    {!compact && <div className="example-chips"><span>试试：</span>{examples.map((item) => <button key={item} onClick={() => { setQuery(item); submit(item); }}>{item}</button>)}</div>}
    {message && <p className="search-message" role="status">{message}</p>}
    {candidates.length > 0 && <div className="candidate-grid">{candidates.map((item) => <button key={item.slug} onClick={() => navigateToCompound(item, query)}><strong>{item.displayNameZh}</strong><span>{item.displayNameEn} · CID {item.pubchemCid}</span><code>{item.pubchemInchiKey}</code></button>)}</div>}
  </div>;
}

function CompoundPage({ cid, query }: { cid: number; query: string }) {
  const [payload, setPayload] = useState<BrowserCompoundPayload | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => {
    const controller = new AbortController();
    aggregateBrowserCompoundEvidence(cid, { signal: controller.signal })
      .then(setPayload)
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "数据检索暂未完成"); });
    return () => controller.abort();
  }, [cid, reload]);

  const retry = () => {
    setPayload(null);
    setError("");
    setReload((current) => current + 1);
  };

  return <main className="result-page"><Header compact /><section className="result-top"><SearchModule compact initialValue={query} /></section><div className="result-shell">
    {error ? <ErrorState message={error} retry={retry} /> : !payload ? <LoadingState /> : <CompoundResult payload={payload} tab={tab} setTab={setTab} />}
  </div><Footer /></main>;
}

function LoadingState() {
  return <section className="result-loading" aria-live="polite"><div className="loading-orbit" /><p className="eyebrow dark"><span /> LIVE RESEARCH DATA</p><h1>正在汇聚公开科研数据</h1><p>正在连接 PubChem、ChEMBL、PubMed / Europe PMC 与 ClinicalTrials.gov</p><div className="loading-sources"><span>化合物身份</span><span>功效论文</span><span>靶点活性</span><span>临床研究</span></div></section>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <section className="result-error" role="alert"><span className="error-mark">!</span><div><p className="eyebrow dark"><span /> CONNECTION STATUS</p><h1>暂时无法完成本次检索</h1><p>{message}</p><p>公开数据库可能暂时不可达，已获取的信息不会受影响，请稍后重试。</p><div className="error-actions"><button onClick={retry}>重新检索</button><a href="#/">返回目录</a></div></div></section>;
}

function CompoundResult({ payload, tab, setTab }: { payload: BrowserCompoundPayload; tab: Tab; setTab: (tab: Tab) => void }) {
  const { compound } = payload;
  const effects = payload.claims.filter((x) => x.kind === "effect");
  const targets = payload.claims.filter((x) => x.kind === "target" || x.kind === "mechanism");
  const uniqueTargets = new Set(payload.bioactivities.map((x) => x.targetName).filter(Boolean)).size;
  return <>
    <a href="#/" className="back-link">← 返回单体目录</a>
    <section className="identity-panel">
      <div className="structure-box"><img src={compound.structureUrl || `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG?record_type=2d`} alt={`${compound.title} 二维结构`} /></div>
      <div className="identity-copy"><p className="identity-kicker">COMPOUND PROFILE · PUBCHEM CID {compound.cid}</p><h1>{compound.title}</h1><p className="synonym-line">{compound.synonyms?.slice(0, 5).join(" · ") || "相关名称整理中"}</p><div className="identity-facts"><div><span>分子式</span><strong>{compound.molecularFormula || "—"}</strong></div><div><span>分子量</span><strong>{compound.molecularWeight || "—"}</strong></div><div><span>InChIKey</span><code>{compound.inchiKey || "—"}</code></div><div><span>Isomeric SMILES</span><code title={compound.isomericSmiles}>{compound.isomericSmiles ? `${compound.isomericSmiles.slice(0, 30)}…` : "—"}</code></div></div></div>
    </section>
    <div className="coverage-row">{payload.sources.filter((source) => !/EPO|机器抽取|单位模型|智能解析/i.test(source.source)).map((source) => <span className={`status-pill ${source.status}`} key={source.source} title={source.message}><i />{sourceName(source.source)}{typeof source.count === "number" ? ` · ${source.count}` : ""}</span>)}<span className="status-pill locked"><i />EPO / 智能解析 · 腾讯云入口</span></div>
    {payload.coverageNote && <p className="coverage-note">{payload.coverageNote}</p>}
    <nav className="result-tabs" aria-label="结果分类">{tabs.map(([key, label]) => <button className={tab === key ? "active" : ""} key={key} onClick={() => setTab(key)}>{label}</button>)}</nav>
    <div className="tab-panel">
      {tab === "overview" && <><div className="metric-grid"><Metric label="实验活性靶点" value={uniqueTargets} note="ChEMBL 活性记录" /><Metric label="功效 / 机制" value={effects.length + targets.length} note="PubMed 文献筛选" /><Metric label="学术论文" value={payload.literature.length} note="PMID / DOI" /><Metric label="临床研究" value={payload.trials.length} note="ClinicalTrials.gov" /></div><Panel title="代表性研究" note="优先展示与当前化合物相关的公开论文"><LiteratureList records={payload.literature.slice(0, 6)} /></Panel></>}
      {tab === "effects" && <Panel title="功效研究进展" note="从 PubMed 文献筛选研究功效、模型与终点"><ClaimList records={effects} empty="当前公开文献中尚未筛选出可结构化展示的功效条目。" /></Panel>}
      {tab === "targets" && <><Panel title="靶点活性数据" note="按精确化学实体汇总 ChEMBL 活性记录"><ActivityTable records={payload.bioactivities} /></Panel><Panel title="机制研究与候选靶点" note="来自公开论文的机制信息"><ClaimList records={targets} empty="当前暂无结构化机制条目。" /></Panel></>}
      {tab === "literature" && <Panel title="学术研究成果" note="题录、摘要、PMID、DOI 与原始链接"><LiteratureList records={payload.literature} /></Panel>}
      {tab === "trials" && <Panel title="临床研究动态" note="试验状态、研究阶段与干预信息"><TrialList records={payload.trials} /></Panel>}
      {tab === "patents" && <Panel title="公开专利线索" note="公开版展示可直接检索的信息"><PatentList records={payload.patents} /></Panel>}
    </div>
  </>;
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function Panel({ title, note, children }: { title: string; note: string; children: ReactNode }) { return <section className="panel-section"><header><h2>{title}</h2><span>{note}</span></header>{children}</section>; }
function Empty({ children }: { children: ReactNode }) { return <div className="empty-state"><span className="empty-icon" /><strong>暂无相关记录</strong><p>{children}</p></div>; }

function LiteratureList({ records }: { records: BrowserCompoundPayload["literature"] }) {
  if (!records.length) return <Empty>当前公开数据源暂无相关论文信息。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}><div className="record-meta"><span className="badge">{item.studyType || "文献"}</span>{item.year && <span className="badge gray">{item.year}</span>}{item.fullTextStatus && <span className="badge green">{item.fullTextStatus}</span>}</div><h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3><p>{item.authors?.slice(0, 4).join(", ")}{item.journal ? ` · ${item.journal}` : ""}{item.pmid ? ` · PMID ${item.pmid}` : ""}{item.doi ? ` · DOI ${item.doi}` : ""}</p>{item.abstract && <p className="abstract">{item.abstract.slice(0, 420)}{item.abstract.length > 420 ? "…" : ""}</p>}</article>)}</div>;
}

function ClaimList({ records, empty }: { records: BrowserCompoundPayload["claims"]; empty: string }) {
  if (!records.length) return <Empty>{empty}</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card claim-card" key={item.id}><div className="record-meta"><span className="badge green">{item.effect || item.evidenceLevel || "研究信息"}</span>{item.reviewStatus && <span className="badge gray">{item.reviewStatus.replace(/机器抽取|未审核/g, "公开文献筛选")}</span>}</div><h3>{item.label}{item.target ? ` · ${item.target}` : ""}</h3><div className="claim-details">{item.model && <span><small>研究模型</small>{item.model}</span>}{item.organism && <span><small>物种 / 对象</small>{item.organism}</span>}{item.dose && <span><small>剂量</small>{item.dose}</span>}{item.endpoint && <span><small>研究终点</small>{item.endpoint}</span>}</div>{item.snippet && <p className="abstract">{item.snippet}</p>}<div className="record-source"><span>{item.pmid ? `PubMed · PMID ${item.pmid}` : item.sourceTitle || item.source || "来源信息"}</span>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">查看原始来源 ↗</a>}</div></article>)}</div>;
}

function TrialList({ records }: { records: BrowserCompoundPayload["trials"] }) {
  if (!records.length) return <Empty>当前暂无明确以该单体为干预的临床试验记录。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}><div className="record-meta"><span className="badge green">{item.status || "状态未知"}</span>{item.phase && <span className="badge">{item.phase}</span>}</div><h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3><p>{item.id}{item.conditions?.length ? ` · ${item.conditions.join(" / ")}` : ""}{item.enrollment ? ` · N=${item.enrollment}` : ""}</p></article>)}</div>;
}

function PatentList({ records }: { records: BrowserCompoundPayload["patents"] }) {
  if (!records.length) return <Empty>浏览器公开入口暂无专利记录。EPO 专利族与法律状态将在腾讯云正式入口开放。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}><div className="record-meta"><span className="badge gold">{item.relation || "专利线索"}</span>{item.legalStatus && <span className="badge gray">{item.legalStatus}</span>}</div><h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title || item.publicationNumber} ↗</a> : item.title || item.publicationNumber}</h3><p>{item.publicationNumber}{item.applicant ? ` · ${item.applicant}` : ""}</p></article>)}</div>;
}

function ActivityTable({ records }: { records: BrowserCompoundPayload["bioactivities"] }) {
  if (!records.length) return <Empty>当前暂无可展示的 ChEMBL 活性记录。</Empty>;
  return <div className="activity-table"><table><thead><tr><th>研究类型</th><th>靶点 / 测试对象</th><th>物种</th><th>测量</th><th>数值</th><th>pChEMBL</th><th>置信度</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td><span className="badge green">{item.evidenceLevel || item.assayType || "活性"}</span></td><td>{item.documentUrl ? <a href={item.documentUrl} target="_blank" rel="noreferrer">{item.targetName} ↗</a> : item.targetName}</td><td>{item.targetOrganism || "—"}</td><td>{item.standardType || "—"}</td><td>{item.standardValue ?? "—"} {item.standardUnits || ""}</td><td>{item.pchemblValue ?? "—"}</td><td>{item.confidenceScore ?? "—"}</td></tr>)}</tbody></table></div>;
}

function sourceName(source: string) {
  if (/europe[_\s-]?pmc/i.test(source)) return "PubMed / Europe PMC";
  if (/机器抽取|单位模型|智能解析/.test(source)) return "智能解析";
  return source;
}

function Footer() { return <footer className="site-footer"><div><img src={asset("brand/giant-biogene.png")} alt="巨子生物" /><span>×</span><img src={asset("brand/nwu.png")} alt="西北大学" /></div><p>巨子生物 × 西北大学 · 人参皂苷科研信息平台</p><small>PUBLIC DATA EDITION · 公开数据入口</small></footer>; }
