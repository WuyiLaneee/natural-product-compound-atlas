import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "平台介绍与数据能力",
  description: "了解天然产物及小分子化合物检索平台的化学实体识别、多源数据整合、靶点分析、专利洞察与持续更新能力。",
};

export default function MethodologyPage() {
  return (
    <main className="page-shell">
      <SiteHeader compact />
      <section className="page-hero">
        <div className="eyebrow"><span /> PLATFORM &amp; DATA CAPABILITIES</div>
        <h1>连接多源科研数据，洞察天然产物与小分子价值</h1>
        <p>天然产物及小分子化合物检索平台围绕化学身份、功效、靶点、论文、临床研究与专利信息，打造一站式科研数据检索与分析体验。</p>
      </section>
      <div className="method-body">
        <div className="method-grid">
          <nav className="method-nav" aria-label="本页目录">
            <a href="#identity">平台概览</a>
            <a href="#sources">数据网络</a>
            <a href="#evidence">分析能力</a>
            <a href="#patents">专利洞察</a>
            <a href="#ai">智能整理</a>
            <a href="#limits">更新机制</a>
          </nav>
          <div className="method-content">
            <section id="identity">
              <h2>1. 精准识别目标化学实体</h2>
              <p>通过常见中文快捷入口、PubChem 可识别的英文名称、CAS、PubChem CID 或 InChIKey，即可关联分子式、分子量、标准结构、同义词与二维结构。对于存在盐型、互变异构或立体异构体的化合物，平台同步展示结构标识，帮助科研人员准确定位目标实体。</p>
              <p className="callout">平台采用完整 27 位 InChIKey 建立精确结构关联，并以 connectivity block 辅助呈现相关异构体，让化合物身份与靶点活性数据保持一致。</p>
            </section>

            <section id="sources">
              <h2>2. 多源科研数据一站汇聚</h2>
              <table>
                <thead><tr><th>数据来源</th><th>核心信息</th><th>平台价值</th></tr></thead>
                <tbody>
                  <tr><td>PubChem</td><td>化合物身份、结构、同义词、来源注释与专利关联</td><td>快速建立标准化化合物档案</td></tr>
                  <tr><td>ChEMBL</td><td>实验活性、assay、靶点与对应文献</td><td>呈现可量化的活性与靶点研究数据</td></tr>
                  <tr><td>PubMed / Europe PMC</td><td>论文、摘要、MeSH、开放全文与文本标注</td><td>追踪学术研究进展与机制线索</td></tr>
                  <tr><td>ClinicalTrials.gov</td><td>试验状态、样本、干预、终点与研究结果</td><td>了解相关临床研究动态</td></tr>
                  <tr><td>EPO OPS</td><td>专利书目、家族、引证、法律状态与公开文本</td><td>洞察技术布局与潜在应用方向</td></tr>
                </tbody>
              </table>
            </section>

            <section id="evidence">
              <h2>3. 靶点与机制分析能力</h2>
              <table>
                <thead><tr><th>研究类型</th><th>核心数据</th><th>研究价值</th></tr></thead>
                <tbody>
                  <tr><td>定量结合</td><td>Kd、Ki 等实验测量数据</td><td>查看化合物与研究对象的定量相互作用</td></tr>
                  <tr><td>功能活性</td><td>受体、酶或离子通道实验</td><td>了解化合物对特定功能对象的活性表现</td></tr>
                  <tr><td>机制研究</td><td>敲低、过表达、抑制剂或救援实验</td><td>追踪细胞与分子层面的作用机制</td></tr>
                  <tr><td>表型研究</td><td>细胞、动物或人体研究数据</td><td>观察功效方向、通路变化与研究终点</td></tr>
                  <tr><td>计算研究</td><td>分子对接、网络药理或机器学习</td><td>发现值得进一步探索的候选研究方向</td></tr>
                </tbody>
              </table>
            </section>

            <section id="patents">
              <h2>4. 专利信息与研发线索</h2>
              <p>平台按 DOCDB 专利家族整合不同国家与阶段的公开信息，并从三个维度呈现化合物与专利的关系：</p>
              <ul>
                <li><strong>权利要求相关：</strong>权利要求涉及该化合物、用途或组合。</li>
                <li><strong>实施例相关：</strong>说明书实施例包含实验、制备或功效数据。</li>
                <li><strong>文本相关：</strong>化合物出现在背景、列表或其他相关文本中。</li>
              </ul>
              <p>平台同时提供 Google Patents、CNIPA 与 PATENTSCOPE 等原始页面入口，方便进一步查看专利文本与法律状态。</p>
            </section>

            <section id="ai">
              <h2>5. 智能化信息整理</h2>
              <p>平台利用智能模型整理公开题录、摘要、开放全文段落与可用专利文本，将功效、靶点、机制、模型和研究终点转化为便于浏览的结构化信息。</p>
              <p className="callout">智能整理记录保留来源 ID、原文定位与内容片段，并与数据库结构化活性分别呈现，帮助科研人员快速发现值得深入阅读的研究线索。</p>
            </section>

            <section id="limits">
              <h2>6. 持续更新与稳定服务</h2>
              <p>平台依据各科研数据库的开放范围与更新节奏持续汇聚公开信息，并展示来源、记录时间及可用状态，让数据进展清晰可见。</p>
              <p>聚合结果默认缓存 6 小时，以兼顾访问速度与数据时效；缓存更新后自动获取最新记录。单一来源服务波动时，页面会保留其他已接入来源的结果并同步显示服务状态。</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
