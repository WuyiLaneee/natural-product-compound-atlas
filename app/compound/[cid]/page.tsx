import type { Metadata } from "next";
import { CompoundExplorer } from "../../components/CompoundExplorer";
import { SearchForm } from "../../components/SearchForm";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata: Metadata = { title: "化合物科研信息", description: "查看人参皂苷单体的化合物信息、功效研究、作用靶点、论文、试验与专利动态。" };

export default async function CompoundPage({ params, searchParams }: { params: Promise<{ cid: string }>; searchParams: Promise<{ q?: string }> }) {
  const { cid } = await params;
  const { q } = await searchParams;
  return <main className="page-shell">
    <SiteHeader compact />
    <section className="result-top"><SearchForm key={`search:${cid}:${q ?? ""}`} compact initialValue={q || ""} /></section>
    <div className="result-shell"><CompoundExplorer key={`result:${cid}:${q ?? ""}`} cid={cid} query={q} /></div>
  </main>;
}
