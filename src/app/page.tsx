// src/app/page.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SearchResponse, SearchResultItem, TranscriptChunk, SearchFilters } from '@/lib/types';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Importando todos os componentes Shadcn/ui necessários
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

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
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<"RELEVANCE" | "DATE_DESC" | "DATE_ASC">("RELEVANCE");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);

  // Estados da Transcrição Selecionada
  const [selectedTranscript, setSelectedTranscript] = useState<SelectedTranscriptState | null>(null);

  // Estados de Carregamento e Erro
  const [isSearching, setIsSearching] = useState(false);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false); // Carregamento inicial do chunk
  const [isMoreContentLoading, setIsMoreContentLoading] = useState(false); // Carregamento de mais chunks
  const [error, setError] = useState<string | null>(null);

  // Ref para o observer do scroll infinito
  const observer = useRef<IntersectionObserver | null>(null);
  const lastChunkElementRef = useCallback((node: HTMLDivElement) => {
    if (isMoreContentLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && selectedTranscript?.nextOffset) {
        loadMoreChunks();
      }
    });
    if (node) observer.current.observe(node);
  }, [isMoreContentLoading, selectedTranscript?.nextOffset]);

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
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search`;
      const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v != null && v !== '')
      );

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          page,
          pageSize: 20,
          filters: cleanedFilters,
          sort
        }),
      });

      if (!response.ok) throw new Error((await response.json()).message || "Erro na busca");
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
    if (selectedTranscript?.id === transcript.id) return;

    setIsTranscriptLoading(true);
    setError(null);
    setSelectedTranscript(null);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/transcripts/${transcript.id}?offset=0&limit=50000`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Falha ao carregar a transcrição.");

      const chunk: TranscriptChunk = await response.json();
      setSelectedTranscript({
        id: chunk.id,
        title: transcript.title,
        content: chunk.text,
        nextOffset: chunk.nextOffset ?? null,
        matchPositions: chunk.matchPositions,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocorreu um erro desconhecido durante a busca.");
      }
    } finally {
      setIsTranscriptLoading(false);
    }
  };

  const loadMoreChunks = async () => {
    if (!selectedTranscript?.nextOffset) return;

    setIsMoreContentLoading(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/transcripts/${selectedTranscript.id}?offset=${selectedTranscript.nextOffset}&limit=50000`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Falha ao carregar mais conteúdo.");

      const chunk: TranscriptChunk = await response.json();
      setSelectedTranscript(prev => prev ? ({
        ...prev,
        content: prev.content + chunk.text,
        nextOffset: chunk.nextOffset ?? null,
      }) : null);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocorreu um erro desconhecido durante a busca.");
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

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold text-center">Buscador de Transcrições</h1>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(1); }} className="flex gap-2 mt-4 max-w-2xl mx-auto">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por..." />
          <Button type="submit" disabled={isSearching}>
            {isSearching && currentPage === 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Buscar
          </Button>
        </form>

        <Accordion type="single" collapsible className="max-w-2xl mx-auto mt-2">
          <AccordionItem value="item-1">
            <AccordionTrigger>Filtros e Ordenação</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Canal ID</Label>
                <Input placeholder="ID do Canal do YouTube" value={filters.channelId || ''} onChange={e => setFilters({ ...filters, channelId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Publicado Após</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filters.publishedAfter && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.publishedAfter ? format(new Date(filters.publishedAfter), "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={filters.publishedAfter ? new Date(filters.publishedAfter) : undefined} onSelect={date => setFilters({ ...filters, publishedAfter: date?.toISOString() })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Ordenar Por</Label>
                <Select value={sort} onValueChange={(value: "RELEVANCE" | "DATE_DESC" | "DATE_ASC") => setSort(value)}>
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

      <div className="grid md:grid-cols-3 flex-1 overflow-hidden">
        <ScrollArea className="md:col-span-1 border-r">
          <div className="p-4 space-y-4">
            {isSearching && currentPage > 1 && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
            {error && <p className="text-destructive p-4 text-center">{error}</p>}

            {searchResponse && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">{searchResponse.totalHits.toLocaleString('pt-BR')} resultados.</p>
                  <p className="text-sm text-muted-foreground">Página {searchResponse.page} de {searchResponse.pageCount}</p>
                </div>
                {searchResponse.results.map((result) => (
                  <Card key={result.id} onClick={() => handleSelectTranscript(result)} className={`cursor-pointer transition-all hover:border-primary ${selectedTranscript?.id === result.id ? 'border-primary' : ''}`}>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{result.title}</CardTitle><CardDescription>{result.channel}</CardDescription></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: result.snippet }} /></CardContent>
                    <CardFooter><div className="text-xs text-muted-foreground/80">Relevância: {result.score.toFixed(3)}</div></CardFooter>
                  </Card>
                ))}

                <Pagination>
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
                    <PaginationItem><PaginationLink href="#">{currentPage}</PaginationLink></PaginationItem>
                    <PaginationItem><PaginationEllipsis /></PaginationItem>
                    <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} className={currentPage === searchResponse.pageCount ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </div>
        </ScrollArea>

        <ScrollArea className="md:col-span-2">
          <div className="p-6">
            {isTranscriptLoading && <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}
            {selectedTranscript && (
              <Card>
                <CardHeader><CardTitle className="text-2xl">{selectedTranscript.title}</CardTitle></CardHeader>
                <Separator className="my-4" />
                <CardContent>
                  <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">{selectedTranscript.content}</div>
                  {/* Div para triggar o carregamento de mais chunks */}
                  <div ref={lastChunkElementRef} className="h-10" />
                  {isMoreContentLoading && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
                  {selectedTranscript.nextOffset === null && <p className="text-center text-sm text-muted-foreground py-4">Fim da transcrição.</p>}
                </CardContent>
              </Card>
            )}
            {!isTranscriptLoading && !selectedTranscript && (
              <div className="flex items-center justify-center h-[80vh] text-muted-foreground">
                <p>Selecione um resultado para ver a transcrição completa.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}