"use client";

import { useState, useRef, useCallback } from "react";
import type {
  SearchResponse,
  SearchResultItem,
  TranscriptChunk,
  SearchFilters,
} from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Importando todos os componentes Shadcn/ui necessários
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

function extractContentByTag(text: string, tagName: string): string | null {
  // A flag 's' permite que '.' capture quebras de linha
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "s");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Corrige strings que contêm "\\n" literal para um caractere de quebra de linha real.
 */
function unescapeString(str: string | null): string {
  if (!str) return "";
  return str.replace(/\\n/g, '\n');
}

// TIPO ATUALIZADO COM TODOS OS CAMPOS QUE VOCÊ QUER EXIBIR
type ParsedTranscript = {
  channelTitle: string | null;
  youtubeId: string | null;
  videoId: string | null;
  chunkId: string | null;
  startTs: string | null;
  endTs: string | null;
  content: string | null;
};

type CachedTranscript = {
  id: string;
  title: string;
  content: string;
  nextOffset: number | null;
  matchPositions: number[];
  parsedData: ParsedTranscript | null;
};


function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Insere <mark> no texto original, ignorando acentos e sem escapar HTML (igual à prévia)
function highlightFull(text: string, query: string): string {
  const q = query.trim();
  if (!q) return text;

  const tn = stripDiacritics(text).toLowerCase();
  const qn = stripDiacritics(q).toLowerCase();

  let out = "";
  let i = 0;
  let last = 0;

  while (true) {
    const idx = tn.indexOf(qn, i);
    if (idx === -1) break;

    out += text.slice(last, idx);
    out += "<mark>" + text.slice(idx, idx + qn.length) + "</mark>";

    i = idx + qn.length;
    last = i;
  }
  out += text.slice(last);
  return out;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Tipo para o estado da transcrição selecionada
type SelectedTranscriptState = {
  id: string;
  title: string;
  content: string;
  nextOffset: number | null;
  matchPositions: number[];
};



export default function HomePage() {
  // Estados da Busca
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<"RELEVANCE" | "DATE_DESC" | "DATE_ASC">(
    "RELEVANCE"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null
  );

  const handleCloseTranscript = () => {
    setSelectedTranscript(null);
    setParsedTranscript(null);
  };

  const handleRefreshTranscript = async () => {
  if (!selectedTranscript) return;
  
  const transcriptId = selectedTranscript.id;
  const transcriptTitle = selectedTranscript.title;
  
  // Remove do cache
  transcriptCache.current.delete(transcriptId);
  console.log('🔄 Cache limpo para:', transcriptId);
  
  // Ativa o loading mas mantém a transcrição aberta
  setIsTranscriptLoading(true);
  setError(null);
  
  try {
    const apiUrl = `${API_BASE_URL}/api/v1/transcripts/${transcriptId}?offset=0&limit=50000`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Falha ao recarregar a transcrição.");

    const chunk: TranscriptChunk = await response.json();
    const rawText = chunk.text;

    // ETAPA DE PARSING
    const metadataBlock = extractContentByTag(rawText, "metadata");
    const channelBlock = metadataBlock ? extractContentByTag(metadataBlock, "channel") : null;
    
    const channelTitle = channelBlock ? extractContentByTag(channelBlock, "title") : null;
    const youtubeId = channelBlock ? extractContentByTag(channelBlock, "youtube_id") : null;
    
    const videoId = metadataBlock ? extractContentByTag(metadataBlock, "video_id") : null;
    const chunkId = metadataBlock ? extractContentByTag(metadataBlock, "chunk_id") : null;
    const startTs = metadataBlock ? extractContentByTag(metadataBlock, "start_ts") : null;
    const endTs = metadataBlock ? extractContentByTag(metadataBlock, "end_ts") : null;

    const rawContent = extractContentByTag(rawText, "content");
    const cleanedContent = unescapeString(rawContent);

    const parsedData: ParsedTranscript = {
      channelTitle,
      youtubeId,
      videoId,
      chunkId,
      startTs,
      endTs,
      content: cleanedContent,
    };

    const transcriptData: CachedTranscript = {
      id: chunk.id,
      title: transcriptTitle,
      content: cleanedContent,
      nextOffset: chunk.nextOffset ?? null,
      matchPositions: chunk.matchPositions,
      parsedData,
    };

    // Salva no cache novamente
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

  // Estados da Transcrição Selecionada
  const [selectedTranscript, setSelectedTranscript] =
    useState<SelectedTranscriptState | null>(null);

  // Cache de transcrições
  const transcriptCache = useRef<Map<string, CachedTranscript>>(new Map());

  const [parsedTranscript, setParsedTranscript] = useState<ParsedTranscript | null>(null);

  // Estados de Carregamento e Erro
  const [isSearching, setIsSearching] = useState(false);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false); // Carregamento inicial do chunk
  const [isMoreContentLoading, setIsMoreContentLoading] = useState(false); // Carregamento de mais chunks
  const [error, setError] = useState<string | null>(null);

  // Flag de layout: duas colunas quando há transcrição selecionada
  const isTwoPane = Boolean(selectedTranscript);

  // Ref para o observer do scroll infinito
  const observer = useRef<IntersectionObserver | null>(null);
  const lastChunkElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isMoreContentLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          selectedTranscript?.nextOffset != null
        ) {
          loadMoreChunks();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isMoreContentLoading, selectedTranscript?.nextOffset]
  );

  const handleSearch = async (page = 1) => {
    if (!query.trim()) {
      setError("Por favor, digite um termo para buscar.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setCurrentPage(page);
    // Limpa a seleção anterior ao iniciar uma nova busca
    if (page === 1) {
      setSearchResponse(null);
      setSelectedTranscript(null);
    }

    try {
      const apiUrl = `${API_BASE_URL}/api/v1/search`;
      const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v != null && v !== "")
      );

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          page,
          pageSize: 20,
          filters: cleanedFilters,
          sort,
        }),
      });

      if (!response.ok)
        throw new Error((await response.json()).message || "Erro na busca");
      setSearchResponse(await response.json());
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

  const handleSelectTranscript = async (transcript: SearchResultItem) => {
    // Se clicar no mesmo item, fecha
    if (selectedTranscript?.id === transcript.id) {
      setSelectedTranscript(null);
      setParsedTranscript(null);
      return;
    }

    // Verifica se está no cache
    const cached = transcriptCache.current.get(transcript.id);
    if (cached) {
      console.log('📦 Carregando do cache:', transcript.id);
      setSelectedTranscript(cached);
      setParsedTranscript(cached.parsedData);
      return;
    }

    // Se não está no cache, busca da API
    setIsTranscriptLoading(true);
    setError(null);
    setSelectedTranscript(null);
    setParsedTranscript(null);

    try {
      const apiUrl = `${API_BASE_URL}/api/v1/transcripts/${transcript.id}?offset=0&limit=50000`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Falha ao carregar a transcrição.");

      const chunk: TranscriptChunk = await response.json();
      const rawText = chunk.text;

      // ETAPA DE PARSING
      const metadataBlock = extractContentByTag(rawText, "metadata");
      const channelBlock = metadataBlock ? extractContentByTag(metadataBlock, "channel") : null;

      const channelTitle = channelBlock ? extractContentByTag(channelBlock, "title") : null;
      const youtubeId = channelBlock ? extractContentByTag(channelBlock, "youtube_id") : null;

      const videoId = metadataBlock ? extractContentByTag(metadataBlock, "video_id") : null;
      const chunkId = metadataBlock ? extractContentByTag(metadataBlock, "chunk_id") : null;
      const startTs = metadataBlock ? extractContentByTag(metadataBlock, "start_ts") : null;
      const endTs = metadataBlock ? extractContentByTag(metadataBlock, "end_ts") : null;

      const rawContent = extractContentByTag(rawText, "content");
      const cleanedContent = unescapeString(rawContent);

      const parsedData: ParsedTranscript = {
        channelTitle,
        youtubeId,
        videoId,
        chunkId,
        startTs,
        endTs,
        content: cleanedContent,
      };

      const transcriptData: CachedTranscript = {
        id: chunk.id,
        title: transcript.title,
        content: cleanedContent,
        nextOffset: chunk.nextOffset ?? null,
        matchPositions: chunk.matchPositions,
        parsedData,
      };

      // Salva no cache
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
      const apiUrl = `${API_BASE_URL}/api/v1/transcripts/${selectedTranscript.id}?offset=${selectedTranscript.nextOffset}&limit=50000`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Falha ao carregar mais conteúdo.");

      const chunk: TranscriptChunk = await response.json();
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

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (searchResponse?.pageCount || 1)) {
      handleSearch(newPage);
    }
  };

  const renderHeader = () => (
    <header className="p-4 border-b">
      <h1 className="text-2xl font-bold text-center">Buscador de Transcrições</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(1);
        }}
        className="mt-4 max-w-2xl mx-auto grid gap-2 md:grid-cols-[1fr_auto] items-start"
      >
        <textarea
          aria-label="Buscar por"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por..."
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-10"
        />
        <Button type="submit" disabled={isSearching}>
          {isSearching && currentPage === 1 ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Buscar
        </Button>
      </form>

      <Accordion type="single" collapsible className="max-w-2xl mx-auto mt-2">
        <AccordionItem value="item-1">
          <AccordionTrigger>Filtros e Ordenação</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Canal ID</Label>
              <Input
                placeholder="ID do Canal do YouTube"
                value={filters.channelId || ""}
                onChange={(e) =>
                  setFilters({ ...filters, channelId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Publicado Após</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal min-w-0 overflow-hidden",
                      !filters.publishedAfter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {filters.publishedAfter
                        ? format(new Date(filters.publishedAfter), "PPP", { locale: ptBR })
                        : "Escolha uma data"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      filters.publishedAfter
                        ? new Date(filters.publishedAfter)
                        : undefined
                    }
                    onSelect={(date) =>
                      setFilters({
                        ...filters,
                        publishedAfter: date?.toISOString(),
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Ordenar Por</Label>
              <Select
                value={sort}
                onValueChange={(value: "RELEVANCE" | "DATE_DESC" | "DATE_ASC") =>
                  setSort(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RELEVANCE">Relevância</SelectItem>
                  <SelectItem value="DATE_DESC">Mais Recentes</SelectItem>
                  <SelectItem value="DATE_ASC">Mais Antigos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </header>
  );

  // Se nenhuma busca foi feita ainda, mostra a "Página 1"
  if (!searchResponse && !isSearching) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground font-sans">
        <div className="flex-1 flex flex-col items-center justify-center">
          {renderHeader()}
          {error && (
            <p className="text-destructive p-4 text-center mt-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Após a busca, mostra a "Página 2"
  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {/* Header global só quando NÃO há transcrição selecionada */}
      {!isTwoPane && renderHeader()}

      {isSearching && currentPage === 1 && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {searchResponse && (
        <div
          className={`grid flex-1 overflow-hidden min-h-0 ${isTwoPane ? "md:grid-cols-3" : "grid-cols-1"
            }`}
        >
          <ScrollArea
            className={`${isTwoPane ? "md:col-span-2 border-r" : "col-span-1"
              } min-h-0 h-full`}
          >
            <div className="p-4 space-y-4">
              {/* Quando houver transcrição selecionada, renderiza o header aqui na coluna esquerda */}
              {isTwoPane && renderHeader()}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Resumo da Busca
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total de Resultados:</span>
                    <span className="font-bold">
                      {searchResponse.totalHits.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {searchResponse.stats?.avgLength && (
                    <div className="flex justify-between mt-1">
                      <span>Tamanho Médio (caracteres):</span>
                      <span className="font-bold">
                        {searchResponse.stats.avgLength.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                <Card
                  key={result.id}
                  onClick={() => handleSelectTranscript(result)}
                  className={`cursor-pointer transition-all hover:border-primary ${selectedTranscript?.id === result.id ? "border-primary" : ""
                    }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{result.title}</CardTitle>
                    <CardDescription>{result.channel}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                  </CardContent>
                  <CardFooter>
                    <div className="text-xs text-muted-foreground/80">
                      Relevância: {result.score.toFixed(3)}
                    </div>
                  </CardFooter>
                </Card>
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
                        className={
                          currentPage === 1 ? "pointer-events-none opacity-50" : ""
                        }
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

          {/* O painel direito SÓ é renderizado se houver uma transcrição selecionada */}
          {selectedTranscript && (
            <ScrollArea className="md:col-span-1 min-h-0 h-full">
              <div className="p-6">
                {isTranscriptLoading && (
                  <div className="text-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </div>
                )}

                {/* Usamos o estado 'parsedTranscript' para renderizar os dados limpos */}
                {parsedTranscript && selectedTranscript && (
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                      <CardTitle className="text-2xl">
                        {selectedTranscript.title}
                      </CardTitle>
                      <div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-primary/10"
                          onClick={handleRefreshTranscript}
                          aria-label="Recarregar transcrição"
                          disabled={isTranscriptLoading}
                        >
                          <RotateCcw className={`h-4 w-4 ${isTranscriptLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-destructive/10 shrink-0 -mt-1"
                          onClick={handleCloseTranscript}
                          aria-label="Fechar transcrição"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                    </CardHeader>
                    <CardContent>
                      {/* SEÇÃO PARA EXIBIR TODOS OS METADADOS */}
                      <div className="space-y-2 text-sm text-muted-foreground mb-6">
                        <h3 className="font-semibold text-foreground">Metadados Extraídos</h3>
                        {parsedTranscript.channelTitle && (
                          <div className="flex justify-between">
                            <span>Canal:</span>
                            <a href={`https://www.youtube.com/channel/${parsedTranscript.youtubeId}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-500 hover:underline">{parsedTranscript.channelTitle}</a>
                          </div>
                        )}
                        {parsedTranscript.youtubeId && (
                          <div className="flex justify-between">
                            <span>ID do Canal:</span>
                            <span className="font-mono">{parsedTranscript.youtubeId}</span>
                          </div>
                        )}
                        {parsedTranscript.videoId && (
                          <div className="flex justify-between">
                            <span>ID do Vídeo:</span>
                            <a href={`https://www.youtube.com/watch?v=${parsedTranscript.videoId}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-500 hover:underline">{parsedTranscript.videoId}</a>
                          </div>
                        )}
                        {parsedTranscript.chunkId && (
                          <div className="flex justify-between">
                            <span>ID do Chunk:</span>
                            <span className="font-mono">{parsedTranscript.chunkId}</span>
                          </div>
                        )}
                        {parsedTranscript.startTs && (
                          <div className="flex justify-between">
                            <span>Timestamp Inicial:</span>
                            <span className="font-mono">{parsedTranscript.startTs}</span>
                          </div>
                        )}
                        {parsedTranscript.endTs && (
                          <div className="flex justify-between">
                            <span>Timestamp Final:</span>
                            <span className="font-mono">{parsedTranscript.endTs}</span>
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />

                      {/* SEÇÃO PARA A TRANSCRIÇÃO FORMATADA */}
                      <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">
                        <ReactMarkdown
                          rehypePlugins={[rehypeRaw]}
                          remarkPlugins={[remarkGfm]}
                          breaks={true}
                        >
                          {highlightFull(parsedTranscript.content || "", query)}
                        </ReactMarkdown>
                      </div>

                      {/* Lógica de scroll infinito */}
                      <div ref={lastChunkElementRef} className="h-10" />
                      {isMoreContentLoading && (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </div>
                      )}
                      {selectedTranscript.nextOffset === null && (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          Fim da transcrição.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}