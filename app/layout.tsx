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
  const previewImage = new URL("/og-china-cosmetics-phytochemistry.png", origin).toString();
  return {
    metadataBase: new URL(origin),
    title: { default: "中国日化前沿靶点与植物化学数据库大模型", template: "%s · 中国日化前沿靶点与植物化学数据库大模型" },
    description: "面向中国日化前沿研究，汇聚天然产物与小分子化合物的化学结构、生物活性、分子靶点及文献数据。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "中国日化前沿靶点与植物化学数据库大模型",
      description: "连接化学结构、生物活性、分子靶点及文献数据。",
      images: [{ url: previewImage, width: 1731, height: 909, alt: "中国日化前沿靶点与植物化学数据库大模型" }],
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
