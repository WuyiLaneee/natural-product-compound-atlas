import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const previewImage = new URL("/og-natural-product.png", origin).toString();
  return {
    metadataBase: new URL(origin),
    title: { default: "天然产物及小分子化合物检索平台 · 巨子生物", template: "%s · 巨子生物" },
    description: "面向天然产物与小分子化合物研究，汇聚化学身份、活性靶点、功效机制、论文、临床试验与专利信息。",
    icons: { icon: "/brand/nwu.png", shortcut: "/brand/nwu.png" },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "天然产物及小分子化合物检索平台 · 巨子生物",
      description: "探索天然产物与小分子化合物，连接科研与创新价值。",
      images: [{ url: previewImage, width: 1730, height: 909, alt: "天然产物及小分子化合物检索平台" }],
    },
    twitter: { card: "summary_large_image", images: [previewImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
