import type { SearchFilters, SearchResponse, TranscriptChunk } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function searchTranscripts(
      query: string,
      page: number,
      pageSize: number,
      filters: SearchFilters,
      sort: "RELEVANCE" | "DATE_DESC" | "DATE_ASC"
): Promise<SearchResponse> {
      console.log('📥 Filtros recebidos:', filters);

      // Processa os filtros de forma explícita
      const cleanedFilters: Record<string, string> = {};

      // Channel ID
      if (filters.channelId) {
            const trimmedChannelId = String(filters.channelId).trim();
            if (trimmedChannelId.length > 0) {
                  cleanedFilters.channelId = trimmedChannelId;
                  console.log('✅ Channel ID adicionado:', trimmedChannelId);
            } else {
                  console.log('⚠️ Channel ID vazio após trim');
            }
      } else {
            console.log('⚠️ Channel ID não fornecido');
      }

      // Published After
      if (filters.publishedAfter) {
            const dateStr = String(filters.publishedAfter).split('T')[0];
            cleanedFilters.publishedAfter = dateStr;
            console.log('✅ Published After adicionado:', dateStr);
      }

      // Published Before (se existir)
      if (filters.publishedBefore) {
            const dateStr = String(filters.publishedBefore).split('T')[0];
            cleanedFilters.publishedBefore = dateStr;
            console.log('✅ Published Before adicionado:', dateStr);
      }

      const requestBody = {
            query,
            page,
            pageSize,
            filters: Object.keys(cleanedFilters).length > 0 ? cleanedFilters : null,
            sort,
      };

      console.log('📤 Requisição completa de busca:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_BASE_URL}/api/v1/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
      });

      console.log('📡 Status da resposta:', response.status);

      if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('❌ Erro na busca:', errorData);
            throw new Error(errorData?.message || "Erro na busca");
      }

      const result = await response.json();
      console.log('✅ Total de resultados:', result.totalHits);
      return result;
}

export async function fetchTranscript(
      transcriptId: string,
      offset: number,
      limit: number
): Promise<TranscriptChunk> {
      const response = await fetch(
            `${API_BASE_URL}/api/v1/transcripts/${transcriptId}?offset=${offset}&limit=${limit}`
      );

      if (!response.ok) {
            throw new Error("Falha ao carregar a transcrição.");
      }

      return response.json();
}

export async function downloadSearchResults(
      query: string,
      page: number,
      pageSize: number,
      filters: SearchFilters,
      sort: "RELEVANCE" | "DATE_DESC" | "DATE_ASC"
): Promise<{ blob: Blob; fileName: string }> {
      const cleanedFilters: Record<string, string> = {};

      if (filters.channelId) {
            const trimmedChannelId = String(filters.channelId).trim();
            if (trimmedChannelId.length > 0) {
                  cleanedFilters.channelId = trimmedChannelId;
            }
      }

      if (filters.publishedAfter) {
            cleanedFilters.publishedAfter = String(filters.publishedAfter).split('T')[0];
      }

      if (filters.publishedBefore) {
            cleanedFilters.publishedBefore = String(filters.publishedBefore).split('T')[0];
      }

      const requestBody = {
            query,
            page,
            pageSize,
            filters: Object.keys(cleanedFilters).length > 0 ? cleanedFilters : null,
            sort,
      };

      console.log('📥 Requisição de download:', requestBody);

      const response = await fetch(`${API_BASE_URL}/api/v1/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
            const contentType = response.headers.get("content-type");
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;

            if (contentType && contentType.includes("application/json")) {
                  const errorData = await response.json();
                  errorMessage = errorData.message || errorData.error || errorMessage;
            } else {
                  const errorText = await response.text();
                  errorMessage = errorText || errorMessage;
            }

            throw new Error(errorMessage);
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = `resultados-${query.replace(/\s+/g, '-')}.zip`;

      if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch && fileNameMatch[1]) {
                  fileName = fileNameMatch[1].replace(/['"]/g, '');
            }
      }

      const blob = await response.blob();

      return { blob, fileName };
}