import type { Metadata } from "next";
import { SearchForm } from "./components/SearchForm";
import { SiteHeader } from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "人参皂苷功效与靶点证据图谱",
  description:
    "输入人参皂苷单体，检索化合物身份、实验靶点、功效证据、论文、临床试验与专利线索。",
};

const evidenceLevels = [
  ["T1", "定量直接结合", "Kd / Ki 等直接结合数据"],
  ["T2", "靶点功能实验", "受体、酶或离子通道功能验证"],
  ["T3", "细胞因果机制", "敲低、过表达、抑制剂或救援实验"],
  ["T4", "表型 / 关联证据", "细胞、动物或人体表型与通路变化，不等同直接靶点"],
  ["T5", "计算预测", "对接、网络药理或机器学习候选"],
];

const dataSources = [
  ["PubChem", "化合物身份与同义词", "实时"],
  ["ChEMBL", "实验活性与靶点", "实时"],
  ["Europe PMC", "论文与开放全文标注", "实时"],
  ["ClinicalTrials.gov", "临床试验与终点", "实时"],
  ["EPO OPS", "专利族与法律状态", "凭据启用"],
  ["单位模型", "结构化证据抽取", "凭据启用"],
];

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="hero-shell">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span /> GINSENOSIDE EVIDENCE ATLAS</div>
          <h1>从一个皂苷单体，<br />抵达每一条可追溯证据</h1>
          <p className="hero-lead">
            聚合化合物身份、实验靶点、功效机制、论文、临床试验与专利族。
            每条结论保留模型边界、证据等级和原始出处。
          </p>
          <SearchForm />
          <div className="scope-note">
            <span className="live-dot" /> 在列明数据源与接口范围内尽可能完整召回，不代表医学建议或法律意见
          </div>
        </div>
        <div className="molecule-orbit" aria-hidden="true">
          <div className="orbit orbit-one"><i /><i /><i /></div>
          <div className="orbit orbit-two"><i /><i /></div>
          <div className="orbit-core">
            <span>C<sub>42</sub>H<sub>72</sub>O<sub>14</sub></span>
            <small>GINSENOSIDE</small>
          </div>
        </div>
      </section>

      <section className="source-strip" aria-label="接入数据源">
        <div className="section-kicker">当前接入</div>
        <div className="source-marquee">
          {dataSources.map(([name, role, state]) => (
            <div className="source-item" key={name}>
              <div><strong>{name}</strong><span>{role}</span></div>
              <em className={state === "实时" ? "active" : "optional"}>{state}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section evidence-intro">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark"><span /> EVIDENCE, NOT ASSOCIATION</div>
            <h2>把“提及”与“证明”分开</h2>
          </div>
          <p>数据库命中不是结论。平台按实验直接性分层，并将专利权利要求、实验实施例和普通提及独立标记。</p>
        </div>
        <div className="evidence-grid">
          {evidenceLevels.map(([level, title, note], index) => (
            <article className="evidence-card" key={level}>
              <div className="level-ring" data-index={index}>{level}</div>
              <h3>{title}</h3>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section workflow-section">
        <div className="workflow-copy">
          <div className="eyebrow dark"><span /> AUDITABLE BY DESIGN</div>
          <h2>不是黑箱摘要，<br />而是可以复核的证据路径</h2>
          <p>名称消歧后才进入检索；完整 InChIKey 用于靶点匹配；论文按 DOI / PMID 去重；专利按家族归并。</p>
          <a className="text-link" href="/methodology">查看检索方法与覆盖边界 <span>→</span></a>
        </div>
        <ol className="workflow-list">
          <li><b>01</b><div><strong>确认化学实体</strong><span>名称、CAS、CID、结构与立体异构体</span></div></li>
          <li><b>02</b><div><strong>并行召回证据</strong><span>实验数据库、论文、试验与专利线索</span></div></li>
          <li><b>03</b><div><strong>标准化与去重</strong><span>统一靶点、文献标识和专利族</span></div></li>
          <li><b>04</b><div><strong>分层呈现</strong><span>直接证据、机制关联、预测与专利声明分开</span></div></li>
        </ol>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <img src="/brand/giant-biogene.png" alt="巨子生物" />
          <span>×</span>
          <img src="/brand/nwu.png" alt="西北大学" />
        </div>
        <p>人参皂苷功效与靶点证据图谱 · 科研信息检索工具</p>
        <p className="footer-note">机器抽取结果会明确标注“未审核”；请回到原始文献或专利核验。</p>
      </footer>
    </main>
  );
}
