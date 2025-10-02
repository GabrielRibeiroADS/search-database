import { useState, useRef, useCallback } from "react";
import type { SearchResultItem } from "@/lib/types";
import { fetchTranscript } from "@/lib/api-service";
import { parseTranscriptData, type CachedTranscript, type ParsedTranscript } from "@/lib/transcript-utils";

type SelectedTranscriptState = {
      id: string;
      title: string;
      content: string;
      nextOffset: number | null;
      matchPositions: number[];
};

export function useTranscript() {
      const [selectedTranscript, setSelectedTranscript] = useState<SelectedTranscriptState | null>(null);
      const [parsedTranscript, setParsedTranscript] = useState<ParsedTranscript | null>(null);
      const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
      const [isMoreContentLoading, setIsMoreContentLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      // Cache de transcrições
      const transcriptCache = useRef<Map<string, CachedTranscript>>(new Map());

      // Observer para scroll infinito
      const observer = useRef<IntersectionObserver | null>(null);
      const lastChunkElementRef = useCallback(
            (node: HTMLDivElement) => {
                  if (isMoreContentLoading) return;
                  if (observer.current) observer.current.disconnect();
                  observer.current = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && selectedTranscript?.nextOffset != null) {
                              loadMoreChunks();
                        }
                  });
                  if (node) observer.current.observe(node);
            },
            [isMoreContentLoading, selectedTranscript?.nextOffset]
      );

      const handleSelectTranscript = async (transcript: SearchResultItem) => {
            if (selectedTranscript?.id === transcript.id) {
                  setSelectedTranscript(null);
                  setParsedTranscript(null);
                  return;
            }

            // Verifica cache
            const cached = transcriptCache.current.get(transcript.id);
            if (cached) {
                  console.log('📦 Carregando do cache:', transcript.id);
                  setSelectedTranscript(cached);
                  setParsedTranscript(cached.parsedData);
                  return;
            }

            setIsTranscriptLoading(true);
            setError(null);
            setSelectedTranscript(null);
            setParsedTranscript(null);

            try {
                  const chunk = await fetchTranscript(transcript.id, 0, 50000);
                  const parsedData = parseTranscriptData(chunk.text);

                  const transcriptData: CachedTranscript = {
                        id: chunk.id,
                        title: transcript.title,
                        content: parsedData.content || "",
                        nextOffset: chunk.nextOffset ?? null,
                        matchPositions: chunk.matchPositions,
                        parsedData,
                  };

                  transcriptCache.current.set(transcript.id, transcriptData);
                  console.log('💾 Salvando no cache:', transcript.id);

                  setParsedTranscript(parsedData);
                  setSelectedTranscript(transcriptData);

            } catch (err) {
                  if (err instanceof Error) {
                        setError(err.message);
                  } else {
                        setError("Ocorreu um erro desconhecido ao carregar a transcrição.");
                  }
            } finally {
                  setIsTranscriptLoading(false);
            }
      };

      const loadMoreChunks = async () => {
            if (selectedTranscript?.nextOffset == null) return;

            setIsMoreContentLoading(true);
            try {
                  const chunk = await fetchTranscript(selectedTranscript.id, selectedTranscript.nextOffset, 50000);
                  setSelectedTranscript((prev) =>
                        prev
                              ? {
                                    ...prev,
                                    content: prev.content + chunk.text,
                                    nextOffset: chunk.nextOffset ?? null,
                              }
                              : null
                  );
            } catch (err) {
                  if (err instanceof Error) {
                        setError(err.message);
                  } else {
                        setError("Ocorreu um erro desconhecido ao carregar mais conteúdo.");
                  }
            } finally {
                  setIsMoreContentLoading(false);
            }
      };

      const handleCloseTranscript = () => {
            setSelectedTranscript(null);
            setParsedTranscript(null);
      };

      const handleRefreshTranscript = async () => {
            if (!selectedTranscript) return;

            const transcriptId = selectedTranscript.id;
            const transcriptTitle = selectedTranscript.title;

            transcriptCache.current.delete(transcriptId);
            console.log('🔄 Cache limpo para:', transcriptId);

            setIsTranscriptLoading(true);
            setError(null);

            try {
                  const chunk = await fetchTranscript(transcriptId, 0, 50000);
                  const parsedData = parseTranscriptData(chunk.text);

                  const transcriptData: CachedTranscript = {
                        id: chunk.id,
                        title: transcriptTitle,
                        content: parsedData.content || "",
                        nextOffset: chunk.nextOffset ?? null,
                        matchPositions: chunk.matchPositions,
                        parsedData,
                  };

                  transcriptCache.current.set(transcriptId, transcriptData);
                  console.log('💾 Cache atualizado:', transcriptId);

                  setParsedTranscript(parsedData);
                  setSelectedTranscript(transcriptData);

            } catch (err) {
                  if (err instanceof Error) {
                        setError(err.message);
                  } else {
                        setError("Ocorreu um erro desconhecido ao recarregar a transcrição.");
                  }
            } finally {
                  setIsTranscriptLoading(false);
            }
      };

      return {
            selectedTranscript,
            parsedTranscript,
            isTranscriptLoading,
            isMoreContentLoading,
            error,
            setError,
            lastChunkElementRef,
            handleSelectTranscript,
            handleCloseTranscript,
            handleRefreshTranscript,
      };
}