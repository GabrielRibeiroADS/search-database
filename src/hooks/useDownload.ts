import { useState } from "react";
import type { SearchFilters } from "@/lib/types";
import { downloadSearchResults } from "@/lib/api-service";

export function useDownload() {
      const [isDownloading, setIsDownloading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      const handleDownload = async (
            query: string,
            currentPage: number,
            filters: SearchFilters,
            sort: "RELEVANCE" | "DATE_DESC" | "DATE_ASC"
      ) => {
            setIsDownloading(true);
            setError(null);

            try {
                  const { blob, fileName } = await downloadSearchResults(query, currentPage, 20, filters, sort);

                  // Cria link para download
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);

                  console.log('✅ Download concluído:', fileName);

            } catch (err) {
                  console.error('❌ Erro no download:', err);
                  if (err instanceof Error) {
                        setError(`Erro ao fazer download: ${err.message}`);
                  } else {
                        setError("Ocorreu um erro desconhecido ao fazer download.");
                  }
            } finally {
                  setIsDownloading(false);
            }
      };

      return {
            isDownloading,
            error,
            handleDownload,
      };
}