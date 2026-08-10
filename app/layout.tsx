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
  const previewImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: { default: "人参皂苷功效与靶点证据图谱", template: "%s · 人参皂苷证据图谱" },
    description: "聚合人参皂苷单体的化合物身份、实验靶点、功效证据、论文、临床试验与专利线索。",
    icons: { icon: "/brand/nwu.png", shortcut: "/brand/nwu.png" },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "人参皂苷功效与靶点证据图谱",
      description: "从一个皂苷单体，抵达每一条可追溯证据。",
      images: [{ url: previewImage, width: 1200, height: 630, alt: "人参皂苷功效与靶点证据图谱" }],
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
