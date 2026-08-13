import type { Metadata } from "next";
import { IngredientExplorer } from "../../components/IngredientExplorer";
import { SearchForm } from "../../components/SearchForm";
import { SiteHeader } from "../../components/SiteHeader";
import { getLocalIngredientBySlug } from "@/lib/evidence/local-ingredients";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ingredient = getLocalIngredientBySlug(decodeURIComponent(slug));
  return ingredient
    ? { title: `${ingredient.identity.name}原料档案`, description: ingredient.identity.summary }
    : { title: "原料档案" };
}

export default async function IngredientPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q } = await searchParams;
  const ingredient = getLocalIngredientBySlug(decodeURIComponent(slug));

  return (
    <main className="page-shell ingredient-page-shell">
      <SiteHeader compact />
      <section className="result-top"><SearchForm key={`ingredient-search:${slug}:${q ?? ""}`} compact initialValue={q || ingredient?.identity.name || ""} /></section>
      <div className="ingredient-result-shell">
        {ingredient
          ? <IngredientExplorer ingredient={ingredient} />
          : <section className="result-error"><strong>未找到该原料档案</strong><p>请返回首页重新检索。</p></section>}
      </div>
    </main>
  );
}
