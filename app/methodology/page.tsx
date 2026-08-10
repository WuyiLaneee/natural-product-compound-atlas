import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "检索方法与覆盖边界",
  description: "了解人参皂苷证据图谱的数据源、证据分层、专利边界与更新方式。",
};

export default function MethodologyPage() {
  return (
    <main className="page-shell">
      <SiteHeader compact />
      <section className="page-hero">
        <div className="eyebrow"><span /> METHODOLOGY &amp; COVERAGE</div>
        <h1>让检索边界和结论一样清楚</h1>
        <p>平台聚合多个独立数据库。这里公开化合物消歧、证据分层、去重规则、专利解释边界与未覆盖范围，方便复核每一条结果。</p>
      </section>
      <div className="method-body">
        <div className="method-grid">
          <nav className="method-nav" aria-label="本页目录">
            <a href="#identity">化学实体</a>
            <a href="#sources">数据源</a>
            <a href="#evidence">证据分层</a>
            <a href="#patents">专利边界</a>
            <a href="#ai">机器抽取</a>
            <a href="#limits">覆盖限制</a>
          </nav>
          <div className="method-content">
            <section id="identity">
              <h2>1. 先确认化学实体，再谈功效</h2>
              <p>输入名称先在核验目录中消歧，再映射到 PubChem CID，并取得分子式、完整 InChIKey、同义词和二维结构。名称可对应多个立体异构体时，平台不会静默选择第一条结果，而是要求用户根据结构与完整 InChIKey 确认。</p>
              <p className="callout">靶点活性仅接受完整 27 位 InChIKey 的精确结构匹配。前 14 位 connectivity block 只能用于相关异构体分组，不能把相似物或另一立体异构体的靶点归给当前单体。</p>
            </section>

            <section id="sources">
              <h2>2. 数据源及职责</h2>
              <table>
                <thead><tr><th>来源</th><th>平台用途</th><th>不代表什么</th></tr></thead>
                <tbody>
                  <tr><td>PubChem</td><td>身份、结构、同义词、来源注释与专利关联</td><td>聚合注释不等于平台独立验证</td></tr>
                  <tr><td>ChEMBL</td><td>实验活性、assay、靶点和对应文献</td><td>activity 条数不等于直接靶点数</td></tr>
                  <tr><td>PubMed / Europe PMC</td><td>论文、摘要、MeSH、开放全文与文本标注</td><td>关键词共现不等于因果机制</td></tr>
                  <tr><td>ClinicalTrials.gov</td><td>试验状态、样本、干预、终点和结果</td><td>试验注册或完成不等于阳性结果</td></tr>
                  <tr><td>EPO OPS</td><td>专利书目、家族、引证、法律状态和可用全文</td><td>不能独自保证全球化合物全文召回</td></tr>
                </tbody>
              </table>
            </section>

            <section id="evidence">
              <h2>3. 靶点证据分层</h2>
              <table>
                <thead><tr><th>等级</th><th>定义</th><th>解释</th></tr></thead>
                <tbody>
                  <tr><td>T1</td><td>定量直接结合</td><td>Kd、Ki 等精确结构匹配的结合数据</td></tr>
                  <tr><td>T2</td><td>单靶点功能实验</td><td>明确的受体、酶或离子通道功能实验</td></tr>
                  <tr><td>T3</td><td>细胞因果机制</td><td>敲低、过表达、抑制剂或救援实验支持</td></tr>
                  <tr><td>T4</td><td>表型或关联证据</td><td>细胞系、动物或人体表型及通路变化，不能自动升级为直接靶点</td></tr>
                  <tr><td>T5</td><td>计算预测</td><td>分子对接、网络药理或机器学习候选</td></tr>
                </tbody>
              </table>
            </section>

            <section id="patents">
              <h2>4. 专利关系单独解释</h2>
              <p>专利按 DOCDB 家族归并，避免同一发明在不同国家和阶段重复计数。与化合物的关系分为三类：</p>
              <ul>
                <li><strong>P-claim：</strong>权利要求文本明确涵盖该化合物、用途或组合。</li>
                <li><strong>P-example：</strong>说明书实施例包含实验、制备或功效数据。</li>
                <li><strong>P-mention：</strong>仅在背景、列表或其他位置提及，不构成功效或权利要求证明。</li>
              </ul>
              <p>Google Patents、CNIPA 与 PATENTSCOPE 仅作为人工原文复核入口，网站不对缺少公开生产 API 的页面进行自动抓取。</p>
            </section>

            <section id="ai">
              <h2>5. 机器抽取不是人工结论</h2>
              <p>单位指定模型仅处理数据库允许使用的题录、摘要、开放全文段落和可用专利文本。每条结构化记录必须包含来源 ID、原文定位和短证据片段；缺少任一项即不保存。</p>
              <p className="callout">首版不设人工审核后台，因此模型生成的功效、靶点和机制记录始终标为“机器抽取 · 未审核”。数据库结构化活性与机器抽取不会混在同一个计数中。</p>
            </section>

            <section id="limits">
              <h2>6. 覆盖与更新时间</h2>
              <p>页面所称“检索结果”是列明数据库、当前接口权限、检索式与更新时间范围内的召回结果，不代表绝对全部论文、专利或生物学作用。部分数据库存在分页、频率、国家覆盖、全文可用性和许可限制。</p>
              <p>聚合结果默认缓存 6 小时，浏览器与边缘节点可短时复用同一结果；缓存过期后才触发实时刷新。来源暂时不可用时，页面会显示该来源的独立错误状态，同时保留其他来源结果。</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
