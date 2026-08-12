import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "./components/SearchForm";
import { SiteHeader } from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "中国日化前沿靶点与植物化学数据库大模型",
  description:
    "面向中国日化前沿研究，汇聚天然产物与小分子化合物的化学身份、生物活性、分子靶点、功效机制与文献数据。",
};

const platformCapabilities = [
  ["01", "多源科研数据聚合", "连接化学、药理、论文、临床试验与专利信息"],
  ["02", "化合物精准检索", "支持常见中文快捷入口、英文名称、CAS、PubChem CID 等多种入口"],
  ["03", "功效与靶点洞察", "集中呈现研究功效、作用靶点与相关机制信息"],
  ["04", "文献与专利导航", "快速定位论文、试验登记与全球专利线索"],
  ["05", "智能科研辅助", "结构化梳理检索结果，助力科研探索与创新决策"],
];

const dataSources = [
  ["PubChem", "化合物身份与同义词", "实时"],
  ["ChEMBL", "实验活性与靶点", "实时"],
  ["PubMed / Europe PMC", "生物医学论文、摘要与开放全文", "实时"],
  ["ClinicalTrials.gov", "临床试验与终点", "实时"],
  ["EPO OPS", "全球专利信息与研发动态", "扩展服务"],
  ["智能解析", "科研信息结构化整理", "扩展服务"],
];

const popularCompounds = [
  { name: "姜黄素", english: "Curcumin", cid: 969516, formula: "C₂₁H₂₀O₆" },
  { name: "白藜芦醇", english: "Resveratrol", cid: 445154, formula: "C₁₄H₁₂O₃" },
  { name: "槲皮素", english: "Quercetin", cid: 5280343, formula: "C₁₅H₁₀O₇" },
  { name: "咖啡因", english: "Caffeine", cid: 2519, formula: "C₈H₁₀N₄O₂" },
];

const researchDirections = [
  { title: "活性与靶点", note: "查看实验活性、测定对象与定量结果", href: "/methodology#evidence", code: "01" },
  { title: "功效与机制", note: "连接研究模型、功效终点与机制线索", href: "/methodology#ai", code: "02" },
  { title: "临床研究", note: "追踪试验设计、研究状态与临床终点", href: "/methodology#sources", code: "03" },
  { title: "专利与应用", note: "发现专利家族、申请人及研发方向", href: "/methodology#patents", code: "04" },
];

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="hero-shell">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span /> DAILY CHEMICAL FRONTIERS · PHYTOCHEMISTRY AI</div>
          <h1>中国日化前沿靶点与<br />植物化学数据库检索平台</h1>
          <p className="hero-lead">小分子化合物及天然产物化学结构、生物活性、分子靶点及文献专利数据</p>
          <SearchForm />
          <div className="compute-status"><i aria-hidden="true" />中国日化前沿靶点与植物化学数据库大模型算力中心</div>
        </div>
        <div className="intelligence-map" aria-hidden="true">
          <span className="map-kicker">MOLECULAR INTELLIGENCE</span>
          <i className="map-link link-structure" /><i className="map-link link-activity" />
          <i className="map-link link-target" /><i className="map-link link-literature" />
          <div className="map-core"><strong className="map-core-wordmark"><b>A</b><em>I</em></strong><span>DISCOVERY<br />ENGINE</span></div>
          <div className="map-node node-structure"><em>01</em><span><strong>化学结构</strong><small>STRUCTURE</small></span></div>
          <div className="map-node node-activity"><em>02</em><span><strong>生物活性</strong><small>BIOACTIVITY</small></span></div>
          <div className="map-node node-target"><em>03</em><span><strong>分子靶点</strong><small>TARGETS</small></span></div>
          <div className="map-node node-literature"><em>04</em><span><strong>科学文献</strong><small>LITERATURE</small></span></div>
          <span className="map-status"><i /> CONNECTED DATA GRAPH</span>
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

      <section className="content-section discovery-section" aria-labelledby="discovery-title">
        <div className="section-heading discovery-heading">
          <div>
            <div className="eyebrow dark"><span /> START YOUR DISCOVERY</div>
            <h2 id="discovery-title">从热门化合物出发，<br />进入多维研究视图</h2>
          </div>
        </div>
        <div className="discovery-layout">
          <div className="popular-compounds" aria-label="热门天然产物">
            <div className="discovery-label">热门天然产物</div>
            <div className="compound-link-grid">
              {popularCompounds.map((compound, index) => (
                <Link href={`/compound/${compound.cid}?q=${encodeURIComponent(compound.name)}`} className="compound-link-card" key={compound.cid}>
                  <span className="compound-link-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="compound-link-copy">
                    <strong>{compound.name}</strong>
                    <small>{compound.english} · CID {compound.cid}</small>
                  </span>
                  <code>{compound.formula}</code>
                  <span className="card-arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="research-directions" aria-label="研究方向">
            <div className="discovery-label">研究方向</div>
            <div className="direction-link-grid">
              {researchDirections.map((direction) => (
                <Link href={direction.href} className="direction-link-card" key={direction.code}>
                  <span>{direction.code}</span>
                  <strong>{direction.title}</strong>
                  <small>{direction.note}</small>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="content-section evidence-intro" id="platform-capabilities">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark"><span /> RESEARCH INTELLIGENCE PLATFORM</div>
            <h2>汇聚科研信息，<br />连接创新灵感</h2>
          </div>
          <p>围绕天然产物与小分子化合物构建多维科研信息视图，帮助研究人员快速了解化学特征、活性靶点、功效方向与全球研发动态。</p>
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
        <div className="footer-brand-rule" aria-hidden="true"><i /><span>PHYTOCHEMISTRY · TARGET INTELLIGENCE</span><i /></div>
        <p className="footer-database-name">中国日化前沿靶点与植物化学数据库</p>
        <p className="footer-database-name-en" lang="en">CHINA FRONTIER DATABASE FOR PERSONAL CARE TARGETS &amp; PHYTOCHEMISTRY</p>
      </footer>
    </main>
  );
}
