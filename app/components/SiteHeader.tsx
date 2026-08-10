import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " compact" : ""}`}>
      <Link href="/" className="brand-lockup" aria-label="返回首页">
        <img className="giant-logo" src="/brand/giant-biogene.png" alt="巨子生物" />
        <span className="brand-cross">×</span>
        <img className="nwu-logo" src="/brand/nwu.png" alt="西北大学" />
        <span className="brand-divider" />
        <span className="product-name">人参皂苷<br />证据图谱</span>
      </Link>
      <nav aria-label="主导航">
        <Link href="/">检索</Link>
        <Link href="/methodology">方法与边界</Link>
        <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">数据源 ↗</a>
      </nav>
    </header>
  );
}
