import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " compact" : ""}`}>
      <Link href="/" className="brand-lockup" aria-label="返回首页">
        <img className="giant-logo" src="/brand/giant-biogene.png" alt="巨子生物" />
        <span className="brand-cross">×</span>
        <img className="nwu-logo" src="/brand/nwu.png" alt="西北大学" />
        <span className="brand-divider" />
        <span className="product-name">天然产物及小分子<br />化合物检索平台</span>
      </Link>
      <div className="header-platform-signature" title="数据来源：巨子生物AI算力中心">
        <span className="header-platform-mark" aria-hidden="true" />
        <span className="header-platform-copy">
          <span className="header-platform-eyebrow">AI COMPUTING CENTER</span>
          <span className="header-platform-title">巨子生物AI算力中心</span>
        </span>
      </div>
    </header>
  );
}
