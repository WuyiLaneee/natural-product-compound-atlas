"use client";

import { useEffect, useMemo, useState } from "react";

type SourceState = { source: string; status: "success" | "partial" | "skipped" | "error"; count?: number; message?: string; fetchedAt?: string };
type Compound = { cid: number; title: string; molecularFormula?: string; molecularWeight?: number | string; inchiKey?: string; isomericSmiles?: string; synonyms?: string[]; structureUrl?: string };
type Literature = { id: string; title: string; authors?: string[]; year?: number; journal?: string; doi?: string; pmid?: string; abstract?: string; url?: string; studyType?: string; fullTextStatus?: string };
type Patent = { id: string; title: string; publicationNumber?: string; applicant?: string; priorityDate?: string; relation?: string; legalStatus?: string; abstract?: string; url?: string; familyId?: string };
type Trial = { id: string; title: string; status?: string; phase?: string; conditions?: string[]; enrollment?: number; intervention?: string; resultsAvailable?: boolean; url?: string };
type Activity = { id: string; targetName: string; targetOrganism?: string; targetType?: string; assayType?: string; standardType?: string; standardValue?: number | string; standardUnits?: string; pchemblValue?: number | string; confidenceScore?: number; evidenceLevel?: string; documentUrl?: string };
type Claim = { id: string; kind: "effect" | "target" | "mechanism"; label: string; target?: string; direction?: string; evidenceLevel?: string; model?: string; organism?: string; dose?: string; endpoint?: string; snippet?: string; sourceTitle?: string; sourceUrl?: string; reviewStatus?: string; isPredicted?: boolean };
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
  if (!payload) return <div className="result-loading"><div><div className="loading-orbit" /><strong>正在汇聚化合物与科研数据</strong><p>PubChem · ChEMBL · Europe PMC · ClinicalTrials · Patents</p></div></div>;

  const { compound } = payload;
  return (
    <>
      <section className="identity-panel">
        <div className="structure-box">
          <img src={compound.structureUrl || `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG?record_type=2d`} alt={`${compound.title} 二维结构`} />
        </div>
        <div className="identity-copy">
          <div className="identity-kicker">COMPOUND PROFILE · PUBCHEM CID {compound.cid}</div>
          <h1>{compound.title}</h1>
          <div className="synonym-line">{compound.synonyms?.slice(0, 5).join(" · ") || query || "相关名称整理中"}</div>
          <div className="identity-facts">
            <div><span>分子式</span><strong>{compound.molecularFormula || "—"}</strong></div>
            <div><span>分子量</span><strong>{compound.molecularWeight || "—"}</strong></div>
            <div><span>InChIKey</span><code>{compound.inchiKey || "—"}</code></div>
            <div><span>Isomeric SMILES</span><code title={compound.isomericSmiles}>{compound.isomericSmiles ? `${compound.isomericSmiles.slice(0, 28)}…` : "—"}</code></div>
          </div>
        </div>
      </section>

      <div className="coverage-row" aria-label="数据源接入状态">
        {payload.sources.map((source) => (
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
            <RecordSection title="代表性研究" note="优先展示与当前化合物高度相关的论文记录">
              <LiteratureList records={payload.literature.slice(0, 5)} />
            </RecordSection>
            <div className="disclaimer-bar">平台持续整合全球公开科研资源，点击具体记录可查看来源信息。</div>
          </>
        )}

        {tab === "effects" && <RecordSection title="功效研究进展" note="按实验模型、剂量、研究终点与物种维度整理"><ClaimsList records={effectClaims} empty="当前暂无结构化功效信息，可前往学术论文查看相关研究。" /></RecordSection>}

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
  if (!records.length) return <Empty>当前暂无明确以该单体为干预的 ClinicalTrials.gov 记录。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className="badge green">{item.status || "状态未知"}</span>{item.phase && <span className="badge">{item.phase}</span>}{item.resultsAvailable && <span className="badge gold">结果可用</span>}</div>
    <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3>
    <p>{item.id}{item.conditions?.length ? ` · ${item.conditions.join(" / ")}` : ""}{item.enrollment ? ` · N=${item.enrollment}` : ""}{item.intervention ? ` · ${item.intervention}` : ""}</p>
  </article>)}</div>;
}

function ClaimsList({ records, empty }: { records: Claim[]; empty: string }) {
  if (!records.length) return <Empty>{empty}</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className={`badge ${item.isPredicted ? "gold" : "green"}`}>{formatResearchType(item.evidenceLevel, item.isPredicted)}</span><span className="badge gray">{formatReviewStatus(item.reviewStatus)}</span></div>
    <h3>{item.label}{item.target ? ` · ${item.target}` : ""}</h3>
    <p>{[item.direction, item.model, item.organism, item.dose, item.endpoint].filter(Boolean).join(" · ")}</p>
    {item.snippet && <p>研究摘要：{item.snippet}</p>}
    {item.sourceUrl && <p><a href={item.sourceUrl} target="_blank" rel="noreferrer">查看研究来源：{item.sourceTitle || item.sourceUrl} ↗</a></p>}
  </article>)}</div>;
}

function formatReviewStatus(status?: string) {
  if (!status || /机器抽取|未审核/.test(status)) return "AI 辅助整理";
  return status;
}

function formatSourceMessage(source: SourceState) {
  if (source.status === "skipped") return "扩展服务可按需启用";
  if (source.status === "error") return "数据源正在更新，请稍后查看";
  return source.message || "数据源已接入";
}

function formatSourceName(source: string) {
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
