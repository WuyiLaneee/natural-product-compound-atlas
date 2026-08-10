import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " compact" : ""}`}>
      <Link href="/" className="brand-lockup" aria-label="返回首页">
        <img className="giant-logo" src="/brand/giant-biogene.png" alt="巨子生物" />
        <span className="brand-cross">×</span>
        <img className="nwu-logo" src="/brand/nwu.png" alt="西北大学" />
        <span className="brand-divider" />
        <span className="product-name">人参皂苷<br />科研平台</span>
      </Link>
      <Link href="/methodology" className="header-platform-signature" aria-label="了解巨子生物科研信息平台">
        <span className="header-platform-mark" aria-hidden="true" />
        <span className="header-platform-copy">
          <span className="header-platform-eyebrow">GIANT BIOGENE SCIENCE</span>
          <span className="header-platform-title">科研信息平台</span>
        </span>
      </Link>
    </header>
  );
}
