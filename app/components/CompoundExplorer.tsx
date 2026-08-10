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
  ["overview", "证据总览"], ["effects", "功效"], ["targets", "靶点"],
  ["patents", "专利"], ["literature", "论文"], ["trials", "临床试验"],
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
        if (!response.ok) throw new Error(data.error || "无法加载该化合物的证据");
        return data;
      })
      .then(setPayload)
      .catch((reason) => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "检索失败"); });
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

  if (error) return <div className="result-error"><strong>证据聚合未完成</strong><p>{error}</p><p>请检查化合物编号或稍后重试。单个数据源失败不会被记录为阴性证据。</p></div>;
  if (!payload) return <div className="result-loading"><div><div className="loading-orbit" /><strong>正在并行核对化学实体与证据来源</strong><p>PubChem · ChEMBL · Europe PMC · ClinicalTrials · Patents</p></div></div>;

  const { compound } = payload;
  return (
    <>
      <section className="identity-panel">
        <div className="structure-box">
          <img src={compound.structureUrl || `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG?record_type=2d`} alt={`${compound.title} 二维结构`} />
        </div>
        <div className="identity-copy">
          <div className="identity-kicker">CONFIRMED CHEMICAL ENTITY · PUBCHEM CID {compound.cid}</div>
          <h1>{compound.title}</h1>
          <div className="synonym-line">{compound.synonyms?.slice(0, 5).join(" · ") || query || "同义词正在整理"}</div>
          <div className="identity-facts">
            <div><span>分子式</span><strong>{compound.molecularFormula || "—"}</strong></div>
            <div><span>分子量</span><strong>{compound.molecularWeight || "—"}</strong></div>
            <div><span>InChIKey</span><code>{compound.inchiKey || "—"}</code></div>
            <div><span>Isomeric SMILES</span><code title={compound.isomericSmiles}>{compound.isomericSmiles ? `${compound.isomericSmiles.slice(0, 28)}…` : "—"}</code></div>
          </div>
        </div>
      </section>

      <div className="coverage-row" aria-label="数据源状态">
        {payload.sources.map((source) => (
          <span key={source.source} className={`status-pill ${source.status}`} title={source.message || ""}>
            <i />{source.source}{typeof source.count === "number" ? ` · ${source.count}` : ""}
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
              <div className="metric-card"><span>靶点特异活性对象</span><strong>{directTargets}</strong><small>仅计 T1 / T2，排除细胞系表型</small></div>
              <div className="metric-card"><span>功效 / 机制声明</span><strong>{effectClaims.length + targetClaims.length}</strong><small>机器抽取会标注未审核</small></div>
              <div className="metric-card"><span>论文记录</span><strong>{payload.literature.length}</strong><small>按 DOI / PMID 去重</small></div>
              <div className="metric-card"><span>专利族线索</span><strong>{payload.patents.length}</strong><small>声明、实施例与提及分开</small></div>
            </div>
            <RecordSection title="最相关论文" note="优先显示直接命中化合物身份的记录">
              <LiteratureList records={payload.literature.slice(0, 5)} />
            </RecordSection>
            <div className="disclaimer-bar">{payload.coverageNote || "结果仅代表当前列明数据库与接口权限范围内的召回；不能替代原始论文、专利权利要求或法律状态核验。"}</div>
          </>
        )}

        {tab === "effects" && <RecordSection title="功效与表型证据" note="模型、剂量、终点和物种边界会随记录保留"><ClaimsList records={effectClaims} empty="尚无可溯源的结构化功效声明；可先查看论文原始记录。" /></RecordSection>}

        {tab === "targets" && (
          <>
            <RecordSection title="ChEMBL 实验活性" note="仅精确化学实体；activity 不直接等同靶点数"><ActivityTable records={payload.bioactivities} /></RecordSection>
            <RecordSection title="机制与预测候选" note="T5 预测不计入实验支持靶点"><ClaimsList records={targetClaims} empty="尚无模型抽取的机制记录；数据库活性仍可独立使用。" /></RecordSection>
          </>
        )}
        {tab === "patents" && <RecordSection title="专利族与用途线索" note="P-claim / P-example / P-mention 分开解释"><PatentList records={payload.patents} /></RecordSection>}
        {tab === "literature" && <RecordSection title="论文证据" note="保留 PMID、DOI、研究类型与全文状态"><LiteratureList records={payload.literature} /></RecordSection>}
        {tab === "trials" && <RecordSection title="临床试验" note="注册、完成或结果可用不自动等同阳性功效"><TrialList records={payload.trials} /></RecordSection>}
      </div>
    </>
  );
}

function RecordSection({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <section className="panel-section"><header className="panel-heading"><h2>{title}</h2><span>{note}</span></header>{children}</section>;
}

function Empty({ children }: { children: React.ReactNode }) { return <div className="empty-state"><strong>当前没有可展示记录</strong><span>{children}</span></div>; }

function LiteratureList({ records }: { records: Literature[] }) {
  if (!records.length) return <Empty>上游数据库可能无收录或暂时不可用。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className="badge">{item.studyType || "文献"}</span>{item.year && <span className="badge gray">{item.year}</span>}{item.fullTextStatus && <span className="badge green">{item.fullTextStatus}</span>}</div>
    <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3>
    <p>{item.authors?.slice(0, 4).join(", ")}{item.journal ? ` · ${item.journal}` : ""}{item.pmid ? ` · PMID ${item.pmid}` : ""}{item.doi ? ` · DOI ${item.doi}` : ""}</p>
    {item.abstract && <p>{item.abstract.slice(0, 360)}{item.abstract.length > 360 ? "…" : ""}</p>}
  </article>)}</div>;
}

function PatentList({ records }: { records: Patent[] }) {
  if (!records.length) return <Empty>EPO 凭据未配置时，页面仍会保留 PubChem 专利关联与人工复核入口。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className="badge gold">{item.relation || "P-mention"}</span>{item.legalStatus && <span className="badge gray">{item.legalStatus}</span>}{item.familyId && <span className="badge">Family {item.familyId}</span>}</div>
    <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title || item.publicationNumber} ↗</a> : item.title || item.publicationNumber}</h3>
    <p>{item.publicationNumber}{item.applicant ? ` · ${item.applicant}` : ""}{item.priorityDate ? ` · 优先权 ${item.priorityDate}` : ""}</p>
    {item.abstract && <p>{item.abstract.slice(0, 360)}{item.abstract.length > 360 ? "…" : ""}</p>}
  </article>)}</div>;
}

function TrialList({ records }: { records: Trial[] }) {
  if (!records.length) return <Empty>未发现明确以该单体为干预的 ClinicalTrials.gov 记录。</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className="badge green">{item.status || "状态未知"}</span>{item.phase && <span className="badge">{item.phase}</span>}{item.resultsAvailable && <span className="badge gold">结果可用</span>}</div>
    <h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3>
    <p>{item.id}{item.conditions?.length ? ` · ${item.conditions.join(" / ")}` : ""}{item.enrollment ? ` · N=${item.enrollment}` : ""}{item.intervention ? ` · ${item.intervention}` : ""}</p>
  </article>)}</div>;
}

function ClaimsList({ records, empty }: { records: Claim[]; empty: string }) {
  if (!records.length) return <Empty>{empty}</Empty>;
  return <div className="record-list">{records.map((item) => <article className="record-card" key={item.id}>
    <div className="record-meta"><span className={`badge ${item.isPredicted ? "gold" : "green"}`}>{item.evidenceLevel || (item.isPredicted ? "T5" : "未分级")}</span><span className="badge gray">{item.reviewStatus || "机器抽取 · 未审核"}</span></div>
    <h3>{item.label}{item.target ? ` · ${item.target}` : ""}</h3>
    <p>{[item.direction, item.model, item.organism, item.dose, item.endpoint].filter(Boolean).join(" · ")}</p>
    {item.snippet && <p>证据片段：{item.snippet}</p>}
    {item.sourceUrl && <p><a href={item.sourceUrl} target="_blank" rel="noreferrer">核对原始来源：{item.sourceTitle || item.sourceUrl} ↗</a></p>}
  </article>)}</div>;
}

function ActivityTable({ records }: { records: Activity[] }) {
  if (!records.length) return <Empty>未在 ChEMBL 中发现满足精确结构匹配的可展示活性。</Empty>;
  return <div className="activity-table"><table><thead><tr><th>等级</th><th>靶点 / 测试对象</th><th>物种</th><th>Assay / 对象类型</th><th>测量</th><th>数值</th><th>pChEMBL</th><th>置信度</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}>
    <td><span className="badge green">{item.evidenceLevel || "T2"}</span></td><td className="target-cell">{item.documentUrl ? <a href={item.documentUrl} target="_blank" rel="noreferrer">{item.targetName} ↗</a> : item.targetName}</td><td>{item.targetOrganism || "—"}</td><td>{item.assayType || item.targetType || "—"}</td><td>{item.standardType || "—"}</td><td>{item.standardValue ?? "—"} {item.standardUnits || ""}</td><td>{item.pchemblValue ?? "—"}</td><td>{item.confidenceScore ?? "—"}</td>
  </tr>)}</tbody></table></div>;
}
