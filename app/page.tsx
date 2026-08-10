import type { Metadata } from "next";
import { SearchForm } from "./components/SearchForm";
import { SiteHeader } from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "人参皂苷科研信息平台",
  description:
    "面向人参皂苷研究与创新，汇聚化合物信息、功效研究、作用靶点、论文、临床试验与专利动态。",
};

const platformCapabilities = [
  ["01", "多源科研数据聚合", "连接化学、药理、论文、临床试验与专利信息"],
  ["02", "化合物精准检索", "支持中英文名称、CAS、PubChem CID 等多种入口"],
  ["03", "功效与靶点洞察", "集中呈现研究功效、作用靶点与相关机制信息"],
  ["04", "文献与专利导航", "快速定位论文、试验登记与全球专利线索"],
  ["05", "智能科研辅助", "结构化梳理检索结果，助力科研探索与创新决策"],
];

const dataSources = [
  ["PubChem", "化合物身份与同义词", "实时"],
  ["ChEMBL", "实验活性与靶点", "实时"],
  ["Europe PMC", "论文与开放全文标注", "实时"],
  ["ClinicalTrials.gov", "临床试验与终点", "实时"],
  ["EPO OPS", "全球专利信息与研发动态", "扩展服务"],
  ["智能解析", "科研信息结构化整理", "扩展服务"],
];

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="hero-shell">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span /> GIANT BIOGENE · GINSENOSIDE RESEARCH</div>
          <h1>从人参皂苷单体出发，<br />探索科研与创新价值</h1>
          <p className="hero-lead">
            汇聚化合物信息、功效研究、作用靶点、论文、临床试验与专利动态，
            为科研探索与产品创新提供高效的信息支持。
          </p>
          <SearchForm />
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
            <div className="eyebrow dark"><span /> RESEARCH INTELLIGENCE PLATFORM</div>
            <h2>汇聚科研信息，<br />连接创新灵感</h2>
          </div>
          <p>围绕人参皂苷单体构建多维科研信息视图，帮助研究人员快速了解化合物特征、功效方向、作用靶点与全球研发动态。</p>
        </div>
        <div className="evidence-grid">
          {platformCapabilities.map(([level, title, note], index) => (
            <article className="evidence-card" key={level}>
              <div className="level-ring" data-index={index}>{level}</div>
              <h3>{title}</h3>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <img src="/brand/giant-biogene.png" alt="巨子生物" />
          <span>×</span>
          <img src="/brand/nwu.png" alt="西北大学" />
        </div>
        <p>巨子生物 × 西北大学 · 人参皂苷科研信息平台</p>
      </footer>
    </main>
  );
}
