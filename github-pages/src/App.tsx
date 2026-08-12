import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  aggregateBrowserCompoundEvidence,
  findChineseCompoundSuggestions,
  resolveBrowserCompound,
  type BrowserCompoundPayload,
  type BrowserCompoundCandidate,
} from "./data/browserAggregator";

type Route = { page: "home" } | { page: "compound"; cid: number; query: string };
type Tab = "overview" | "effects" | "targets" | "literature" | "trials" | "patents";

interface CuratedExample extends BrowserCompoundCandidate {
  labelZh: string;
  group: "天然产物" | "药用小分子" | "功能分子";
}

const examples: readonly CuratedExample[] = [
  { cid: 5280343, title: "Quercetin", labelZh: "槲皮素", molecularFormula: "C15H10O7", group: "天然产物" },
  { cid: 445154, title: "Resveratrol", labelZh: "白藜芦醇", molecularFormula: "C14H12O3", group: "天然产物" },
  { cid: 969516, title: "Curcumin", labelZh: "姜黄素", molecularFormula: "C21H20O6", group: "天然产物" },
  { cid: 441923, title: "Ginsenoside Rg1", labelZh: "人参皂苷 Rg1", molecularFormula: "C42H72O14", group: "天然产物" },
  { cid: 2244, title: "Aspirin", labelZh: "阿司匹林", molecularFormula: "C9H8O4", group: "药用小分子" },
  { cid: 3672, title: "Ibuprofen", labelZh: "布洛芬", molecularFormula: "C13H18O2", group: "药用小分子" },
  { cid: 2519, title: "Caffeine", labelZh: "咖啡因", molecularFormula: "C8H10N4O2", group: "功能分子" },
  { cid: 936, title: "Niacinamide", labelZh: "烟酰胺", molecularFormula: "C6H6N2O", group: "功能分子" },
  { cid: 54670067, title: "L-Ascorbic acid", labelZh: "L-抗坏血酸", molecularFormula: "C6H8O6", group: "功能分子" },
];
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

function navigateToCompound(cid: number, query: string) {
  window.location.hash = `/compound/${cid}?q=${encodeURIComponent(query)}`;
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
      <span className="product-name">天然产物及小分子<br />化合物检索平台</span>
    </a>
    <div className="header-edition" title="数据来源：巨子生物AI算力中心">
      <span className="edition-dot" />
      <span><small>AI COMPUTING CENTER</small><strong>巨子生物AI算力中心</strong></span>
    </div>
  </header>;
}

function HomePage() {
  return <main>
    <Header />
    <section className="hero-shell">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow"><span /> GIANT BIOGENE · MOLECULAR DISCOVERY</p>
        <h1>天然产物与小分子<br />的智能发现平台</h1>
        <p className="hero-lead">连接化学结构、生物活性、分子靶点及文献数据</p>
        <SearchModule />
        <div className="public-scope"><i />已连接巨子生物AI算力中心</div>
      </div>
      <div className="intelligence-map" aria-hidden="true">
        <span className="map-kicker">MOLECULAR INTELLIGENCE</span>
        <i className="map-link link-structure" /><i className="map-link link-activity" />
        <i className="map-link link-target" /><i className="map-link link-literature" />
        <div className="map-core"><strong>AI</strong><span>DISCOVERY<br />ENGINE</span></div>
        <div className="map-node node-structure"><em>01</em><span><strong>化学结构</strong><small>STRUCTURE</small></span></div>
        <div className="map-node node-activity"><em>02</em><span><strong>生物活性</strong><small>BIOACTIVITY</small></span></div>
        <div className="map-node node-target"><em>03</em><span><strong>分子靶点</strong><small>TARGETS</small></span></div>
        <div className="map-node node-literature"><em>04</em><span><strong>科学文献</strong><small>LITERATURE</small></span></div>
        <span className="map-status"><i /> CONNECTED DATA GRAPH</span>
      </div>
    </section>

    <section className="source-strip" aria-label="公开数据源">
      <div><strong>PubChem</strong><span>身份解析与结构</span><em>实时</em></div>
      <div><strong>ChEMBL</strong><span>活性与靶点</span><em>实时</em></div>
      <div><strong>PubMed / Europe PMC</strong><span>论文与功效</span><em>实时</em></div>
      <div><strong>ClinicalTrials.gov</strong><span>临床研究</span><em>实时</em></div>
    </section>

    <section className="catalog-section" id="examples">
      <header className="section-heading">
        <div><p className="eyebrow dark"><span /> START WITH A MOLECULE</p><h2>常见化合物示例</h2></div>
        <p>以下为已确认 PubChem CID 的快速入口。平台不限于这些示例，也可在上方输入其他天然产物或小分子。</p>
      </header>
      <div className="catalog-grid">
        {examples.map((entry, index) => <button className="compound-card" key={entry.cid} onClick={() => navigateToCompound(entry.cid, entry.title)}>
          <span className="compound-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="compound-names"><strong>{entry.labelZh}</strong><small>{entry.title} · {entry.group}</small></span>
          <span className="compound-cid">CID {entry.cid} · {entry.molecularFormula}</span><span className="card-arrow">→</span>
        </button>)}
      </div>
    </section>
    <Footer />
  </main>;
}

function SearchModule({ compact = false, initialValue = "" }: { compact?: boolean; initialValue?: string }) {
  const [query, setQuery] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<BrowserCompoundCandidate[]>([]);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof findChineseCompoundSuggestions>>([]);
  const [resolving, setResolving] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  async function submit(value = query) {
    const clean = value.trim();
    if (!clean) { setMessage("请输入名称、CAS、PubChem CID 或 InChIKey"); return; }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setCandidates([]); setSuggestions([]); setMessage(""); setResolving(true);
    try {
      const resolution = await resolveBrowserCompound(clean, { signal: controller.signal });
      if (resolution.candidates.length === 1 && (resolution.queryKind === "cid" || resolution.queryKind === "inchikey")) {
        navigateToCompound(resolution.candidates[0].cid, clean);
        return;
      }
      setCandidates(resolution.candidates);
      setMessage(resolution.message || (resolution.candidates.length === 1
        ? "PubChem 将输入解释为以下实体，请核对结构、分子式和 InChIKey 后确认。"
        : "请从 PubChem 候选结构中选择。"));
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setMessage("化合物解析暂未完成，请稍后重试。");
      }
    } finally {
      if (requestRef.current === controller) setResolving(false);
    }
  }

  return <div className={`search-module${compact ? " compact" : ""}`}>
    <form className="search-box" role="search" onSubmit={(event: FormEvent) => { event.preventDefault(); submit(); }}>
      <label className="sr-only" htmlFor={compact ? "search-compact" : "search-main"}>检索天然产物及小分子化合物</label>
      <span className="search-icon" aria-hidden="true" />
      <input
        id={compact ? "search-compact" : "search-main"}
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setCandidates([]);
          setMessage("");
          setSuggestions(findChineseCompoundSuggestions(nextQuery));
        }}
        placeholder="输入中文名、英文名、CAS、CID 或 InChIKey，如：槲皮素"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls={suggestions.length > 0 ? `${compact ? "compact" : "main"}-chinese-suggestions` : undefined}
      />
      <button type="submit" disabled={resolving}>{resolving ? "解析中" : "开始检索"} <span>→</span></button>
    </form>
    {suggestions.length > 0 && <div className="search-suggestions" id={`${compact ? "compact" : "main"}-chinese-suggestions`} role="listbox" aria-label="中文化合物名称建议">
      {suggestions.map((item) => <button type="button" role="option" aria-selected="false" key={`${item.labelZh}:${item.englishName}`} onClick={() => { setQuery(item.labelZh); submit(item.labelZh); }}>
        <strong>{item.labelZh}</strong><span>{item.englishName}</span>
      </button>)}
    </div>}
    {!compact && <div className="example-chips"><span>快速查看：</span>{examples.slice(0, 4).map((item) => <button key={item.cid} onClick={() => navigateToCompound(item.cid, item.title)}>{item.labelZh}</button>)}</div>}
    {message && <p className="search-message" role="status">{message}</p>}
    {candidates.length > 0 && <div className="candidate-grid" aria-label="PubChem 候选化学实体">{candidates.map((item) => <button key={item.cid} onClick={() => navigateToCompound(item.cid, query)}><img src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${item.cid}/PNG?record_type=2d&image_size=small`} alt="" /><span className="candidate-copy"><strong>{item.title}</strong>{item.iupacName && item.iupacName !== item.title && <small>IUPAC · {item.iupacName}</small>}<span>CID {item.cid} · {item.molecularFormula || "分子式未返回"}{item.charge !== undefined ? ` · 净电荷 ${item.charge}` : ""}{item.covalentUnitCount !== undefined ? ` · ${item.covalentUnitCount} 个共价单元` : ""}</span><code>{item.inchiKey || "InChIKey 未返回"}</code>{item.entityNote && <small className="candidate-entity-note">实体范围提示：{item.entityNote}</small>}</span><span className="candidate-action">确认此结构 →</span></button>)}</div>}
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
  return <section className="result-error" role="alert"><span className="error-mark">!</span><div><p className="eyebrow dark"><span /> CONNECTION STATUS</p><h1>暂时无法完成本次检索</h1><p>{message}</p><p>公开数据库可能暂时不可达，已获取的信息不会受影响，请稍后重试。</p><div className="error-actions"><button onClick={retry}>重新检索</button><a href="#/">返回检索首页</a></div></div></section>;
}

function CompoundResult({ payload, tab, setTab }: { payload: BrowserCompoundPayload; tab: Tab; setTab: (tab: Tab) => void }) {
  const { compound } = payload;
  const effects = payload.claims.filter((x) => x.kind === "effect");
  const targets = payload.claims.filter((x) => x.kind === "target" || x.kind === "mechanism");
  const uniqueTargets = new Set(payload.bioactivities.map((x) => x.targetName).filter(Boolean)).size;
  return <>
    <a href="#/" className="back-link">← 返回检索首页</a>
    <section className="identity-panel">
      <div className="structure-box"><img src={compound.structureUrl || `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG?record_type=2d`} alt={`${compound.title} 二维结构`} /></div>
      <div className="identity-copy"><p className="identity-kicker">COMPOUND PROFILE · PUBCHEM CID {compound.cid}</p><h1>{compound.title}</h1><p className="synonym-line">{compound.synonyms?.slice(0, 5).join(" · ") || "相关名称整理中"}</p>{compound.iupacName && <p className="iupac-line"><span>IUPAC</span>{compound.iupacName}</p>}<div className="identity-facts"><div><span>分子式</span><strong>{compound.molecularFormula || "—"}</strong></div><div><span>分子量</span><strong>{compound.molecularWeight || "—"}</strong></div><div><span>净电荷</span><strong>{compound.charge ?? "—"}</strong></div><div><span>共价单元</span><strong>{compound.covalentUnitCount ?? "—"}</strong></div><div><span>InChIKey</span><code>{compound.inchiKey || "—"}</code></div><div><span>原子立体中心</span><strong>{compound.definedAtomStereoCount !== undefined || compound.undefinedAtomStereoCount !== undefined ? `${compound.definedAtomStereoCount ?? 0} 已定义 · ${compound.undefinedAtomStereoCount ?? 0} 未定义` : "—"}</strong></div><div><span>Isomeric SMILES</span><code title={compound.isomericSmiles}>{compound.isomericSmiles ? `${compound.isomericSmiles.slice(0, 30)}…` : "—"}</code></div></div>{compound.entityNote && <aside className="entity-note"><strong>实体范围提示</strong><span>{compound.entityNote}</span></aside>}</div>
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
  if (!records.length) return <Empty>当前暂无明确以该化合物为干预的临床试验记录。</Empty>;
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

function Footer() { return <footer className="site-footer"><div><img src={asset("brand/giant-biogene.png")} alt="巨子生物" /><span>×</span><img src={asset("brand/nwu.png")} alt="西北大学" /></div><p>巨子生物 × 西北大学 · 天然产物及小分子化合物检索平台</p><small>AI COMPUTING CENTER · 巨子生物AI算力中心</small></footer>; }
