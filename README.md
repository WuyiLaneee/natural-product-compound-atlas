# 人参皂苷功效与靶点证据图谱

面向人参皂苷单体的可追溯证据检索网站。输入中文名、英文名、CAS、PubChem CID 或完整 InChIKey，可查看：

- PubChem 化学实体、同义词、二维结构与专利交叉引用
- ChEMBL 精确结构匹配的生物活性与测试对象
- Europe PMC 论文、摘要、DOI/PMID 与开放全文状态
- ClinicalTrials.gov 临床试验记录
- EPO OPS 专利族、权利要求与实施例线索（需生产凭据）
- OpenAI-compatible 模型抽取的功效、靶点与机制声明（需生产凭据，始终标注未审核）

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

## 证据边界

平台使用 T1–T5 证据分层，并将专利中的 `P-claim`、`P-example` 与 `P-mention` 分开呈现。数据库命中、关键词共现、试验注册和计算预测均不自动等同于功效成立或直接靶点证据。详细规则见网站的“方法与边界”页面。
