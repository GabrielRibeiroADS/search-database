import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SearchResponse, SearchFilters } from "@/lib/types";
import { searchTranscripts } from "@/lib/api-service";

export function useSearch(
      initialQuery: string,
      initialFilters: SearchFilters,
      initialSort: "RELEVANCE" | "DATE_DESC" | "DATE_ASC"
) {
      const router = useRouter();
      const [query] = useState(initialQuery);
      const [currentPage, setCurrentPage] = useState(1);
      const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
      const [isSearching, setIsSearching] = useState(false);
      const [error, setError] = useState<string | null>(null);

      const filters = initialFilters;
      const sort = initialSort;

      // Executa a busca automaticamente ao carregar
      useEffect(() => {
            if (initialQuery) {
                  handleSearch(1);
            }
      }, []);

      const handleSearch = async (page = 1) => {
            if (!query.trim()) {
                  setError("Por favor, digite um termo para buscar.");
                  return;
            }

            setIsSearching(true);
            setError(null);
            setCurrentPage(page);

            if (page === 1) {
                  setSearchResponse(null);
            }

            try {
                  const response = await searchTranscripts(query, page, 20, filters, sort);
                  setSearchResponse(response);

                  // Atualiza a URL
                  const params = new URLSearchParams();
                  params.set("q", query);
                  params.set("sort", sort);
                  if (filters.channelId) params.set("channelId", filters.channelId);
                  if (filters.publishedAfter) params.set("publishedAfter", filters.publishedAfter);
                  router.replace(`/results?${params.toString()}`, { scroll: false });

            } catch (err) {
                  if (err instanceof Error) {
                        setError(err.message);
                  } else {
                        setError("Ocorreu um erro desconhecido durante a busca.");
                  }
            } finally {
                  setIsSearching(false);
            }
      };

      const handlePageChange = (newPage: number) => {
            if (newPage > 0 && newPage <= (searchResponse?.pageCount || 1)) {
                  handleSearch(newPage);
            }
      };

      return {
            query,
            currentPage,
            searchResponse,
            isSearching,
            error,
            setError,
            handleSearch,
            handlePageChange,
      };
}