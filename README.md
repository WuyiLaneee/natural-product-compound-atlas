# 天然产物及小分子化合物检索平台

面向天然产物、活性成分与常见小分子化合物的一站式科研信息检索网站。可通过常见中文快捷入口、英文名称、CAS、PubChem CID 或完整 InChIKey 进入检索，可查看：

- PubChem 化学实体、同义词、二维结构与专利交叉引用
- ChEMBL 精确结构匹配的生物活性与测试对象
- Europe PMC 论文、摘要、DOI/PMID 与开放全文状态
- ClinicalTrials.gov 临床试验记录
- EPO OPS 专利族、权利要求与实施例线索（需生产凭据）
- OpenAI-compatible 模型辅助整理的功效、靶点与机制信息（需生产凭据）

当前开放检索范围为能够由 PubChem 解析并返回 CID 的化学实体。通用名称检索以 PubChem 可识别的英文名称为准；若一个名称对应一个或多个结构，页面都会先展示候选项，由用户确认具体化学实体后再汇聚科研数据。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

常用校验：

```bash
npm run typecheck
npm run lint
npm test
```

生产环境变量名称见 `.env.example`。敏感值只应保存在 Sites 的生产环境配置中，不应写入仓库。

## 数据处理

平台按 PubChem CID 缓存聚合结果，并保留 DOI、PMID、NCT ID、专利号和数据库原始链接。论文、临床试验、活性记录和专利线索会分别去重，便于从展示结果返回原始数据库继续核对。
