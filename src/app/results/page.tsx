"use client";

import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
      Pagination,
      PaginationContent,
      PaginationEllipsis,
      PaginationItem,
      PaginationLink,
      PaginationNext,
      PaginationPrevious,
} from "@/components/ui/pagination";

// Componentes
import { SearchHeader } from "@/components/results/SearchHeader";
import { SearchSummary } from "@/components/results/SearchSummary";
import { ResultCard } from "@/components/results/ResultCard";
import { TranscriptPanel } from "@/components/results/TranscriptPanel";

// Hooks
import { useSearch } from "@/hooks/useSearch";
import { useTranscript } from "@/hooks/useTranscript";
import { useDownload } from "@/hooks/useDownload";

export default function ResultsPage() {
      const searchParams = useSearchParams();

      // Extrai os parâmetros da URL
      const urlQuery = searchParams.get("q") || "";
      const urlSort = (searchParams.get("sort") as "RELEVANCE" | "DATE_DESC" | "DATE_ASC") || "RELEVANCE";
      const urlChannelId = searchParams.get("channelId") || "";
      const urlPublishedAfter = searchParams.get("publishedAfter") || "";

      const filters = {
            channelId: urlChannelId || undefined,
            publishedAfter: urlPublishedAfter || undefined,
      };

      // Hooks customizados
      const {
            query,
            currentPage,
            searchResponse,
            isSearching,
            error: searchError,
            setError: setSearchError,
            handlePageChange,
      } = useSearch(urlQuery, filters, urlSort);

      const {
            selectedTranscript,
            parsedTranscript,
            isTranscriptLoading,
            isMoreContentLoading,
            error: transcriptError,
            setError: setTranscriptError,
            lastChunkElementRef,
            handleSelectTranscript,
            handleCloseTranscript,
            handleRefreshTranscript,
      } = useTranscript();

      const {
            isDownloading,
            error: downloadError,
            handleDownload,
      } = useDownload();

      // Combina os erros
      const error = searchError || transcriptError || downloadError;
      const setError = (err: string | null) => {
            setSearchError(err);
            setTranscriptError(err);
      };

      const isTwoPane = Boolean(selectedTranscript);

      // Loading inicial
      if (isSearching && !searchResponse) {
            return (
                  <div className="flex flex-col h-screen bg-background text-foreground font-sans">
                        <SearchHeader query={query} />
                        <div className="flex-1 flex items-center justify-center">
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                  </div>
            );
      }

      // Sem resultados ainda
      if (!searchResponse) {
            return (
                  <div className="flex flex-col h-screen bg-background text-foreground font-sans">
                        <SearchHeader query={query} />
                        {error && (
                              <p className="text-destructive p-4 text-center mt-4">{error}</p>
                        )}
                  </div>
            );
      }

      return (
            <div className="flex flex-col h-screen bg-background text-foreground font-sans">
                  {!isTwoPane && <SearchHeader query={query} />}

                  <div className={`grid flex-1 overflow-hidden min-h-0 ${isTwoPane ? "md:grid-cols-3" : "grid-cols-1"}`}>
                        {/* Coluna de Resultados */}
                        <ScrollArea className={`${isTwoPane ? "md:col-span-2 border-r" : "col-span-1"} min-h-0 h-full`}>
                              <div className="p-4 space-y-4">
                                    {isTwoPane && <SearchHeader query={query} />}

                                    <SearchSummary
                                          searchResponse={searchResponse}
                                          isDownloading={isDownloading}
                                          onDownload={() => handleDownload(query, currentPage, filters, urlSort)}
                                    />

                                    {error && (
                                          <p className="text-destructive p-4 text-center">{error}</p>
                                    )}

                                    <div className="flex justify-between items-center">
                                          <p className="text-sm text-muted-foreground">
                                                {searchResponse.results.length > 0
                                                      ? "Exibindo resultados:"
                                                      : "Nenhum resultado encontrado."}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                                Página {searchResponse.page} de {searchResponse.pageCount}
                                          </p>
                                    </div>

                                    {searchResponse.results.map((result) => (
                                          <ResultCard
                                                key={result.id}
                                                result={result}
                                                isSelected={selectedTranscript?.id === result.id}
                                                onClick={() => handleSelectTranscript(result)}
                                          />
                                    ))}

                                    {searchResponse.pageCount > 1 && (
                                          <Pagination>
                                                <PaginationContent>
                                                      <PaginationItem>
                                                            <PaginationPrevious
                                                                  href="#"
                                                                  onClick={(e) => {
                                                                        e.preventDefault();
                                                                        handlePageChange(currentPage - 1);
                                                                  }}
                                                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                                            />
                                                      </PaginationItem>
                                                      <PaginationItem>
                                                            <PaginationLink href="#">{currentPage}</PaginationLink>
                                                      </PaginationItem>
                                                      <PaginationItem>
                                                            <PaginationEllipsis />
                                                      </PaginationItem>
                                                      <PaginationItem>
                                                            <PaginationNext
                                                                  href="#"
                                                                  onClick={(e) => {
                                                                        e.preventDefault();
                                                                        handlePageChange(currentPage + 1);
                                                                  }}
                                                                  className={
                                                                        currentPage === searchResponse.pageCount
                                                                              ? "pointer-events-none opacity-50"
                                                                              : ""
                                                                  }
                                                            />
                                                      </PaginationItem>
                                                </PaginationContent>
                                          </Pagination>
                                    )}
                              </div>
                        </ScrollArea>

                        {/* Painel de Transcrição */}
                        {selectedTranscript && (
                              <ScrollArea className="md:col-span-1 min-h-0 h-full">
                                    <div className="p-6">
                                          <TranscriptPanel
                                                title={selectedTranscript.title}
                                                content={selectedTranscript.content}
                                                parsedData={parsedTranscript}
                                                isLoading={isTranscriptLoading}
                                                isLoadingMore={isMoreContentLoading}
                                                hasMore={selectedTranscript.nextOffset !== null}
                                                lastChunkRef={lastChunkElementRef}
                                                onRefresh={handleRefreshTranscript}
                                                onClose={handleCloseTranscript}
                                          />
                                    </div>
                              </ScrollArea>
                        )}
                  </div>
            </div>
      );
}