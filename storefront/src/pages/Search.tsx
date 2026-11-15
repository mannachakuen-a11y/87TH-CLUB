import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { searchProducts } from "../data";

export function SearchResults({ q }: { q: string }) {
  const results = searchProducts(q);
  return (
    <main className="main collection search-results" id="main">
      <h1 className="visually-hidden">Search results for {q}</h1>
      {q.trim() === "" ? null : results.length ? (
        <>
          <p className="results-count">
            {results.length} {results.length === 1 ? "result" : "results"} for “{q}”
          </p>
          <ProductGrid items={results} />
        </>
      ) : (
        <div className="empty">
          <p>No results for “{q}”.</p>
          <p>Try searching for a product type, such as hoodie, tee, jacket or beanie.</p>
        </div>
      )}
    </main>
  );
}

export default function Search() {
  const [params] = useSearchParams();
  return <SearchResults q={params.get("q") ?? ""} />;
}
