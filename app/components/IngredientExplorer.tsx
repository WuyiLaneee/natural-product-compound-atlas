import type { LocalIngredientRecord } from "@/lib/evidence/local-ingredients";

const DATABASE_NAME = "中国日化前沿靶点与植物化学数据库";

function TagList({ items }: { items: readonly { name: string; details?: string }[] }) {
  return (
    <div className="ingredient-tag-list">
      {items.map((item, index) => (
        <div className="ingredient-tag" key={`${item.name}:${index}`}>
          <strong>{item.name}</strong>
          {item.details && <span>{item.details}</span>}
        </div>
      ))}
    </div>
  );
}

export function IngredientExplorer({ ingredient }: { ingredient: LocalIngredientRecord }) {
  const primaryFactor = ingredient.functionalFactors[0]?.name ?? "功能因子";
  const hasMechanismClues = ingredient.mechanismClues.some(
    (clue) => clue.name !== "具体分子靶点",
  );

  return (
    <article className="ingredient-dossier">
      <nav className="ingredient-dossier-nav" aria-label="原料档案导航">
        <div className="ingredient-dossier-brand"><i aria-hidden="true" /> TARGETS · PHYTOCHEMISTRY · AI</div>
        <div className="ingredient-dossier-links">
          <a href="#ingredient-overview">原料总览</a>
          <a href="#ingredient-knowledge">知识图谱</a>
          <a href="#ingredient-literature">相关文献</a>
        </div>
      </nav>

      <p className="ingredient-breadcrumb">搜索结果 <span>/</span> 原料知识档案
      </p>

      <header className="ingredient-identity" id="ingredient-overview">
        <div className="ingredient-ribbon"><span>原料</span><span>档案</span></div>
        <div className="ingredient-identity-mark">
          <img src="/ingredient-research-archive.png" alt="植物化学研究档案装饰" />
        </div>
        <div className="ingredient-identity-copy">
          <div className="ingredient-record-label">INGREDIENT RESEARCH PROFILE</div>
          <div className="ingredient-title-row">
            <h1>{ingredient.identity.name}</h1>
            <span className="ingredient-database-badge">数据库收录</span>
          </div>
          <p className="ingredient-type">{ingredient.identity.type} <i /> {ingredient.identity.subtype}</p>
          <p className="ingredient-summary">{ingredient.identity.summary}</p>
        </div>
        <div className="ingredient-source-card">
          <span>DATA SOURCE</span>
          <strong>{DATABASE_NAME}</strong>
          <small>{ingredient.source.recordType}</small>
        </div>
      </header>

      <div className="ingredient-dossier-grid">
        <div className="ingredient-knowledge" id="ingredient-knowledge">
          <section className="ingredient-panel ingredient-graph-panel">
            <header className="ingredient-panel-heading">
              <div><span>KNOWLEDGE GRAPH</span><h2>知识图谱概览</h2></div>
              <small>从原料身份到研究线索的分层展示</small>
            </header>
            <ol className="ingredient-flow" aria-label="原料知识流程">
              <li><b>01</b><span>{ingredient.identity.name}</span><small>原料名称</small></li>
              <li><b>02</b><span>{primaryFactor}</span><small>功能因子</small></li>
              <li><b>03</b><span>代表性成分</span><small>{ingredient.representativeComponents.length} 项记录</small></li>
              <li><b>04</b><span>研究功效</span><small>{ingredient.researchEffects.length} 项方向</small></li>
              {hasMechanismClues && <li><b>05</b><span>机制线索</span><small>{ingredient.mechanismClues.length} 项线索</small></li>}
            </ol>
          </section>

          <div className="ingredient-knowledge-columns">
            <section className="ingredient-panel" id="ingredient-factors">
              <header className="ingredient-panel-heading compact"><div><span>FUNCTIONAL FACTORS</span><h2>功能因子</h2></div></header>
              <TagList items={ingredient.functionalFactors} />
            </section>
            <section className="ingredient-panel" id="ingredient-components">
              <header className="ingredient-panel-heading compact"><div><span>REPRESENTATIVE COMPONENTS</span><h2>代表性成分</h2></div></header>
              <TagList items={ingredient.representativeComponents} />
            </section>
          </div>

          <section className="ingredient-panel" id="ingredient-composition">
            <header className="ingredient-panel-heading"><div><span>COMPOSITION</span><h2>含量或组成信息</h2></div></header>
            <div className="ingredient-composition-grid">
              {ingredient.composition.map((entry, index) => (
                <div className="ingredient-composition-card" key={`${entry.label}:${index}`}>
                  <span>{entry.label}</span><strong>{entry.value}</strong>
                  {entry.basis && <small>{entry.basis}</small>}
                  {entry.boundary && <p>{entry.boundary}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="ingredient-panel" id="ingredient-effects">
            <header className="ingredient-panel-heading"><div><span>RESEARCH EFFECTS</span><h2>研究功效</h2></div></header>
            <TagList items={ingredient.researchEffects} />
          </section>

          <section className="ingredient-panel ingredient-inline-literature" id="ingredient-literature">
            <header className="ingredient-panel-heading"><div><span>LITERATURE</span><h2>相关文献</h2></div></header>
            <div className="ingredient-literature-list">
              <p className="ingredient-literature-intro">{ingredient.literature.message}</p>
              {ingredient.literature.records.map((record) => (
                <article className="ingredient-literature-record" key={`${record.title}:${record.year}`}>
                  <span>{record.relationship}</span>
                  <h3>{record.url ? <a href={record.url} target="_blank" rel="noreferrer">{record.title} ↗</a> : record.title}</h3>
                  <p>{record.journal} · {record.year}</p>
                  <div className="ingredient-literature-effects"><b>对应功效</b>{record.effects.map((effect) => <i key={effect}>{effect}</i>)}</div>
                  {(record.pmid || record.doi || record.sourceNote) && <small>{record.pmid ? `PMID ${record.pmid}` : record.doi ? `DOI ${record.doi}` : record.sourceNote}</small>}
                </article>
              ))}
            </div>
          </section>

          {hasMechanismClues && <section className="ingredient-panel" id="ingredient-mechanisms">
              <header className="ingredient-panel-heading"><div><span>TARGETS &amp; MECHANISMS</span><h2>靶点与机制线索</h2></div></header>
              <div className="ingredient-mechanism-list">
                {ingredient.mechanismClues.filter((clue) => clue.name !== "具体分子靶点").map((clue, index) => (
                  <article key={`${clue.name}:${index}`}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <div><h3>{clue.name}</h3><p>{clue.details}</p><small>{clue.evidenceBoundary}</small></div>
                  </article>
                ))}
              </div>
            </section>}
        </div>

        <aside className="ingredient-sidebar">
          <section className="ingredient-panel ingredient-data-source">
            <header className="ingredient-panel-heading compact"><div><span>DATABASE</span><h2>数据来源</h2></div></header>
            <strong>{DATABASE_NAME}</strong>
            <p>条目内容由数据库按原料、成分、功效与机制线索结构化呈现。</p>
          </section>
        </aside>
      </div>
    </article>
  );
}
