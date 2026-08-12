import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " compact" : ""}`}>
      <Link href="/" className="brand-lockup" aria-label="中国日化前沿靶点与植物化学数据库大模型，返回首页">
        <span className="product-name">中国日化前沿靶点与<br />植物化学数据库大模型</span>
      </Link>
      <div className="header-platform-signature" title="中国日化前沿靶点与植物化学数据库大模型算力中心">
        <span className="header-platform-mark" aria-hidden="true" />
        <span className="header-platform-copy">
          <span className="header-platform-eyebrow">DATABASE MODEL COMPUTING CENTER</span>
          <span className="header-platform-title">中国日化前沿靶点与植物化学数据库大模型算力中心</span>
        </span>
      </div>
    </header>
  );
}
