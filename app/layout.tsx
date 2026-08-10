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
  const previewImage = new URL("/og-corporate.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: { default: "巨子生物 · 人参皂苷科研信息平台", template: "%s · 巨子生物" },
    description: "面向人参皂苷研究与创新，汇聚化合物信息、功效研究、作用靶点、论文、临床试验与专利动态。",
    icons: { icon: "/brand/nwu.png", shortcut: "/brand/nwu.png" },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "巨子生物 · 人参皂苷科研信息平台",
      description: "从人参皂苷单体出发，探索科研与创新价值。",
      images: [{ url: previewImage, width: 1200, height: 630, alt: "巨子生物人参皂苷科研信息平台" }],
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
