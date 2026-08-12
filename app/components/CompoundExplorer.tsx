"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveChineseCompoundName } from "@/lib/evidence/chinese-compounds";

type SourceState = { source: string; status: "success" | "partial" | "skipped" | "error"; count?: number; message?: string; fetchedAt?: string };
type Compound = {
  cid: number;
  title: string;
  iupacName?: string;
  molecularFormula?: string;
  molecularWeight?: number | string;
  charge?: number;
  covalentUnitCount?: number;
  definedAtomStereoCount?: number;
  undefinedAtomStereoCount?: number;
  inchiKey?: string;
  isomericSmiles?: string;
  synonyms?: string[];
  entityNote?: string;
  structureUrl?: string;
};
type Literature = { id: string; title: string; authors?: string[]; year?: number; journal?: string; doi?: string; pmid?: string; abstract?: string; url?: string; studyType?: string; fullTextStatus?: string };
type Patent = { id: string; title: string; publicationNumber?: string; applicant?: string; priorityDate?: string; relation?: string; legalStatus?: string; abstract?: string; url?: string; familyId?: string };
type Trial = { id: string; title: string; status?: string; phase?: string; conditions?: string[]; enrollment?: number; intervention?: string; resultsAvailable?: boolean; url?: string };
type Activity = { id: string; targetName: string; targetOrganism?: string; targetType?: string; assayType?: string; standardType?: string; standardValue?: number | string; standardUnits?: string; pchemblValue?: number | string; confidenceScore?: number; evidenceLevel?: string; documentUrl?: string };
type Claim = {
  id: string;
  kind: "effect" | "target" | "mechanism";
  label: string;
  effect?: string;
  target?: string;
  direction?: string;
  evidenceLevel?: string;
  model?: string;
  organism?: string;
  dose?: string;
  endpoint?: string;
  snippet?: string;
  sourceLocator?: string;
  source?: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  pmid?: string;
  reviewStatus?: string;
  isPredicted?: boolean;
};
type Payload = { compound: Compound; sources: SourceState[]; literature: Literature[]; patents: Patent[]; trials: Trial[]; bioactivities: Activity[]; claims: Claim[]; coverageNote?: string };

const tabLabels = [
  ["overview", "数据总览"], ["effects", "功效研究"], ["targets", "靶点研究"],
  ["patents", "专利信息"], ["literature", "学术论文"], ["trials", "临床研究"],
] as const;

export function CompoundExplorer({ cid, query }: { cid: string; query?: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof tabLabels)[number][0]>("overview");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/compound/${encodeURIComponent(cid)}${query ? `?q=${encodeURIComponent(query)}` : ""}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as Payload & { error?: string };
        if (!response.ok) throw new Error(data.error || "暂时无法加载该化合物的数据");
        return data;
      })
      .then(setPayload)
      .catch((reason) => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "数据检索暂未完成"); });
    return () => controller.abort();
  }, [cid, query]);

  const directTargets = useMemo(() => {
    if (!payload) return 0;
    return new Set(
      payload.bioactivities
        .filter((item) => (item.evidenceLevel === "T1" || item.evidenceLevel === "T2") && !/non-protein/i.test(item.targetName))
        .map((item) => item.targetName),
    ).size;
  }, [payload]);
  const effectClaims = payload?.claims.filter((item) => item.kind === "effect") ?? [];
  const targetClaims = payload?.claims.filter((item) => item.kind === "target" || item.kind === "mechanism") ?? [];

  if (error) return <div className="result-error"><strong>数据聚合暂未完成</strong><p>{error}</p><p>请检查化合物编号或稍后重试。</p></div>;
  if (!payload) return <div className="result-loading"><div><div className="loading-orbit" /><strong>正在链接巨子生物AI数据库</strong><p>PubChem · ChEMBL · PubMed / Europe PMC · ClinicalTrials · Patents</p></div></div>;

  const { compound } = payload;
  const matchedChineseEntry = query ? resolveChineseCompoundName(query) : undefined;
  const confirmedChineseEntry = matchedChineseEntry?.cid === compound.cid ? matchedChineseEntry : undefined;
  return (
    <>
      <section className="identity-panel">
        <div className="structure-box">
          <img src={compound.structureUrl || `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG?record_type=2d`} alt={`${compound.title} 二维结构`} />
        </div>
        <div className="identity-copy">
          <div className="identity-kicker">COMPOUND PROFILE · PUBCHEM CID {compound.cid}</div>
          <h1>{compound.title}</h1>
          {confirmedChineseEntry && <p className="chinese-identity-line"><span>中文名称</span><strong>{confirmedChineseEntry.labelZh}</strong><small>CSV 精确关联 CID {confirmedChineseEntry.cid}</small></p>}
          <div className="synonym-line">{compound.synonyms?.slice(0, 5).join(" · ") || query || "相关名称整理中"}</div>
          {compound.iupacName && <p className="iupac-line"><span>IUPAC</span>{compound.iupacName}</p>}
          <div className="identity-facts">
            <div><span>分子式</span><strong>{compound.molecularFormula || "—"}</strong></div>
            <div><span>分子量</span><strong>{compound.molecularWeight || "—"}</strong></div>
            <div><span>净电荷</span><strong>{compound.charge ?? "—"}</strong></div>
            <div><span>共价单元</span><strong>{compound.covalentUnitCount ?? "—"}</strong></div>
            <div><span>InChIKey</span><code>{compound.inchiKey || "—"}</code></div>
            <div><span>原子立体中心</span><strong>{compound.definedAtomStereoCount !== undefined || compound.undefinedAtomStereoCount !== undefined ? `${compound.definedAtomStereoCount ?? 0} 已定义 · ${compound.undefinedAtomStereoCount ?? 0} 未定义` : "—"}</strong></div>
            <div><span>Isomeric SMILES</span><code title={compound.isomericSmiles}>{compound.isomericSmiles ? `${compound.isomericSmiles.slice(0, 28)}…` : "—"}</code></div>
          </div>
          {compound.entityNote && <aside className="entity-note"><strong>实体范围提示</strong><span>{compound.entityNote}</span></aside>}
        </div>
      </section>

      <div className="coverage-row" aria-label="数据源接入状态">
        {payload.sources.filter((source) => !/EPO|机器抽取|单位模型|智能解析/i.test(source.source)).map((source) => (
          <span key={source.source} className={`status-pill ${source.status}`} title={formatSourceMessage(source)}>
            <i />{formatSourceName(source.source)}{source.status === "skipped" ? " · 扩展服务" : typeof source.count === "number" ? ` · ${source.count}` : ""}
          </span>
        ))}
      </div>

      <nav className="result-tabs" aria-label="结果分类">
        {tabLabels.map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </nav>

      <div className="tab-panel">
        {tab === "overview" && (
          <>
            <div className="metric-grid">
              <div className="metric-card"><span>实验活性靶点</span><strong>{directTargets}</strong><small>定量结合与功能活性数据</small></div>
              <div className="metric-card"><span>功效 / 机制信息</span><strong>{effectClaims.length + targetClaims.length}</strong><small>结构化科研信息</small></div>
              <div className="metric-card"><span>学术论文</span><strong>{payload.literature.length}</strong><small>汇总 DOI / PMID</small></div>
              <div className="metric-card"><span>专利信息</span><strong>{payload.patents.length}</strong><small>按专利族整理</small></div>
            </div>
            <RecordSection title="相关功效摘要" note="确认 PubChem CID 后，从 PubMed / Europe PMC 题录与摘要中筛选">
              <ClaimsList records={effectClaims.slice(0, 6)} empty="当前公开文献中尚未筛选出可结构化展示的功效条目。" />
            </RecordSection>
            <RecordSection title="代表性研究" note="优先展示与当前化合物高度相关的论文记录">
              <LiteratureList records={payload.literature.slice(0, 5)} />
            </RecordSection>
            <div className="disclaimer-bar">平台持续整合全球公开科研资源，点击具体记录可查看来源信息。</div>
          </>
        )}

        {tab === "effects" && <RecordSection title="功效研究进展" note="从 PubMed 文献中筛选功效、研究模型、物种与研究终点"><ClaimsList records={effectClaims} empty="当前尚未生成结构化功效条目。平台将从 PubMed 收录文献的题录与摘要中，筛选与当前化合物直接相关的功效、研究模型、物种和研究终点，完成后将在此展示。" /></RecordSection>}

        {tab === "targets" && (
          <>
            <RecordSection title="靶点活性数据" note="按精确化学实体汇总 ChEMBL 活性记录"><ActivityTable records={payload.bioactivities} /></RecordSection>
            <RecordSection title="机制研究与候选靶点" note="融合实验研究与计算分析线索"><ClaimsList records={targetClaims} empty="当前暂无结构化机制信息，可查看靶点活性与论文记录。" /></RecordSection>
          </>
        )}
        {tab === "patents" && <RecordSection title="专利布局与应用方向" note="按专利族、申请人和用途关系整理"><PatentList records={payload.patents} /></RecordSection>}
        {tab === "literature" && <RecordSection title="学术研究成果" note="汇集题录、摘要、PMID、DOI 与全文状态"><LiteratureList records={payload.literature} /></RecordSection>}
        {tab === "trials" && <RecordSection title="临床研究动态" note="展示试验状态、研究设计与结果可用情况"><TrialList records={payload.trials} /></RecordSection>}
      </div>
    </>
  );
}

function RecordSection({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <section className="panel-section"><header className="panel-heading"><h2>{title}</h2><span>{note}</span></header>{children}</section>;
}

function Empty({ children }: { children: React.ReactNode }) { return <div className="empty-state"><strong>暂无相关记录</strong><span>{children}</span></div>; }

function LiteratureList({ records }: { records: Literature[] }) {
  if (!records.length) return <Empty>当前数据源暂无相关论文信息，平台将随数据库更新持续补充。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className="badge">{item.studyType || "文献"}</span>{item.year && <span className="badge gray">{item.year}</span>}{item.fullTextStatus && <span className="badge green">{item.fullTextStatus}</span>}</div>
    <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3>
    <p>{item.authors?.slice(0, 4).join(", ")}{item.journal ? ` · ${item.journal}` : ""}{item.pmid ? ` · PMID ${item.pmid}` : ""}{item.doi ? ` · DOI ${item.doi}` : ""}</p>
    {item.abstract && <p>{item.abstract.slice(0, 360)}{item.abstract.length > 360 ? "…" : ""}</p>}
  </article>)}</div>;
}

function PatentList({ records }: { records: Patent[] }) {
  if (!records.length) return <Empty>当前暂无可展示的专利信息，平台将持续更新专利族、申请人与法律状态。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className="badge gold">{formatPatentRelation(item.relation)}</span>{item.legalStatus && <span className="badge gray">{item.legalStatus}</span>}{item.familyId && <span className="badge">Family {item.familyId}</span>}</div>
    <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title || item.publicationNumber} ↗</a> : item.title || item.publicationNumber}</h3>
    <p>{item.publicationNumber}{item.applicant ? ` · ${item.applicant}` : ""}{item.priorityDate ? ` · 优先权 ${item.priorityDate}` : ""}</p>
    {item.abstract && <p>{item.abstract.slice(0, 360)}{item.abstract.length > 360 ? "…" : ""}</p>}
  </article>)}</div>;
}

function TrialList({ records }: { records: Trial[] }) {
  if (!records.length) return <Empty>当前暂无明确以该化合物为干预的 ClinicalTrials.gov 记录。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className="badge green">{item.status || "状态未知"}</span>{item.phase && <span className="badge">{item.phase}</span>}{item.resultsAvailable && <span className="badge gold">结果可用</span>}</div>
    <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3>
    <p>{item.id}{item.conditions?.length ? ` · ${item.conditions.join(" / ")}` : ""}{item.enrollment ? ` · N=${item.enrollment}` : ""}{item.intervention ? ` · ${item.intervention}` : ""}</p>
  </article>)}</div>;
}

function ClaimsList({ records, empty }: { records: Claim[]; empty: string }) {
  if (!records.length) return <Empty>{empty}</Empty>;
  return <div className="record-list">{records.map((item) => {
    const isEffect = item.kind === "effect";
    const pmid = getClaimPmid(item);
    const details = [
      item.model && ["研究模型", formatStudyModel(item.model)],
      item.organism && ["物种 / 对象", item.organism],
      item.dose && ["给药剂量", item.dose],
      item.endpoint && ["研究终点", item.endpoint],
      item.direction && ["作用方向", formatDirection(item.direction)],
    ].filter(Boolean) as string[][];

    return <article className={`record-card claim-card${isEffect ? " effect-claim-card" : ""}`} key={item.id}>
      <div className="record-meta">
        {isEffect && <span className="claim-effect-label">{item.effect || "功效研究"}</span>}
        <span className={`badge ${item.isPredicted ? "gold" : "green"}`}>{formatResearchType(item.evidenceLevel, item.isPredicted)}</span>
        <span className="badge gray">{formatReviewStatus(item, pmid)}</span>
      </div>
      <h3>{item.label}{item.target ? ` · ${item.target}` : ""}</h3>
      {details.length > 0 && <dl className="claim-detail-grid">
        {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>}
      {item.snippet && <p className="claim-snippet"><strong>{item.sourceLocator === "title" ? "题录依据" : "摘要依据"}</strong>{item.snippet}</p>}
      <div className="claim-source-row">
        <span>文献来源</span>
        <div className="claim-source-copy">
          <strong>{formatClaimSource(item, pmid)}</strong>
          {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">{isPubMedClaim(item, pmid) ? "查看 PubMed / Europe PMC 原文" : "查看研究来源"} ↗</a>}
        </div>
      </div>
    </article>;
  })}</div>;
}

function getClaimPmid(item: Claim) {
  if (item.pmid) return item.pmid.replace(/^PMID\s*:?\s*/i, "").trim();
  const sourceText = [item.source, item.sourceId, item.sourceTitle, item.sourceUrl].filter(Boolean).join(" ");
  const explicitMatch = sourceText.match(/(?:PMID\s*:?\s*|pubmed(?:\.ncbi\.nlm\.nih\.gov)?\/)(\d{5,9})/i);
  if (explicitMatch) return explicitMatch[1];
  const europePmcUrlMatch = sourceText.match(/europepmc\.org\/article\/MED\/(\d{5,9})/i);
  if (europePmcUrlMatch) return europePmcUrlMatch[1];
  const europePmcIdMatch = sourceText.match(/europe[_\s-]?pmc\s*(?:·|:|-)?\s*(?!PMC)(\d{5,9})\b/i);
  return europePmcIdMatch?.[1];
}

function formatReviewStatus(item: Claim, pmid?: string) {
  if (/AI 辅助整理/i.test(item.reviewStatus || "")) return "AI 辅助整理";
  if (/PubMed 文献筛选/i.test(item.reviewStatus || "")) return "PubMed 文献筛选";
  if (isPubMedClaim(item, pmid)) return "PubMed 文献筛选";
  if (!item.reviewStatus || /机器抽取|未审核/.test(item.reviewStatus)) return "AI 辅助整理";
  return item.reviewStatus;
}

function isPubMedClaim(item: Claim, pmid?: string) {
  const sourceText = [item.source, item.sourceTitle, item.sourceUrl].filter(Boolean).join(" ");
  return Boolean(pmid || /pubmed|europe[_\s-]?pmc/i.test(sourceText) || /PubMed 文献筛选/i.test(item.reviewStatus || ""));
}

function formatClaimSource(item: Claim, pmid?: string) {
  if (pmid) return `PubMed · PMID ${pmid}`;
  const source = item.sourceTitle || [item.source, item.sourceId].filter(Boolean).join(" · ");
  if (!source) return "来源信息整理中";
  if (/PubMed\s*\/\s*Europe PMC/i.test(source)) return source;
  return source.replace(/europe[_\s-]?pmc/i, "PubMed / Europe PMC");
}

function formatStudyModel(model: string) {
  const labels: Record<string, string> = {
    biochemical: "生化实验",
    cell: "细胞模型",
    animal: "动物模型",
    human: "人体研究",
    computational: "计算研究",
    other: "多模型 / 未明确",
  };
  return model.split(" · ").map((part) => labels[part.toLowerCase()] || part).join(" · ");
}

function formatDirection(direction: string) {
  const labels: Record<string, string> = {
    increase: "升高",
    decrease: "降低",
    activate: "激活",
    inhibit: "抑制",
    bind: "结合",
    mixed: "改善 / 调节",
    unknown: "待明确",
  };
  return labels[direction.toLowerCase()] || direction;
}

function formatSourceMessage(source: SourceState) {
  if (source.status === "skipped") return "扩展服务可按需启用";
  if (source.status === "error") return "数据源正在更新，请稍后查看";
  return source.message || "数据源已接入";
}

function formatSourceName(source: string) {
  if (/europe[_\s-]?pmc/i.test(source)) return "PubMed / Europe PMC";
  return /机器抽取|单位模型/.test(source) ? "智能解析" : source;
}

function formatResearchType(level?: string, isPredicted = false) {
  const labels: Record<string, string> = {
    T1: "定量结合",
    T2: "功能活性",
    T3: "机制研究",
    T4: "表型研究",
    T5: "计算研究",
  };
  return (level && labels[level]) || (isPredicted ? "计算研究" : level) || "研究信息";
}

function formatPatentRelation(relation?: string) {
  const labels: Record<string, string> = {
    "P-claim": "权利要求相关",
    "P-example": "实施例相关",
    "P-mention": "文本相关",
  };
  return (relation && labels[relation]) || relation || "文本相关";
}

function ActivityTable({ records }: { records: Activity[] }) {
  if (!records.length) return <Empty>当前暂无可展示的 ChEMBL 活性记录。</Empty>;
  return <div className="activity-table"><table><thead><tr><th>研究类型</th><th>靶点 / 测试对象</th><th>物种</th><th>Assay / 对象类型</th><th>测量</th><th>数值</th><th>pChEMBL</th><th>置信度</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}>
    <td><span className="badge green">{formatResearchType(item.evidenceLevel)}</span></td><td className="target-cell">{item.documentUrl ? <a href={item.documentUrl} target="_blank" rel="noreferrer">{item.targetName} ↗</a> : item.targetName}</td><td>{item.targetOrganism || "—"}</td><td>{item.assayType || item.targetType || "—"}</td><td>{item.standardType || "—"}</td><td>{item.standardValue ?? "—"} {item.standardUnits || ""}</td><td>{item.pchemblValue ?? "—"}</td><td>{item.confidenceScore ?? "—"}</td>
  </tr>)}</tbody></table></div>;
}
