// src/app/page.tsx
"use client";

import { useState } from 'react';
import type { SearchResponse, TranscriptResponse } from '@/lib/types';

// Importando componentes Shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptResponse | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setError("Por favor, digite um termo para buscar.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResponse(null);
    setSelectedTranscript(null);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/search`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, page: 1, pageSize: 20 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro na busca: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      setSearchResponse(data);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSelectTranscript = async (transcriptId: string) => {
    if (selectedTranscript?.id === transcriptId) return;

    setIsTranscriptLoading(true);
    setError(null);
    setSelectedTranscript(null);
    
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/transcripts/${transcriptId}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error("Falha ao carregar a transcrição completa.");
      }

      const data: TranscriptResponse = await response.json();
      setSelectedTranscript(data);
    } catch (err: any) {
       setError(err.message);
    } finally {
       setIsTranscriptLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold text-center">Buscador de Transcrições</h1>
        <form onSubmit={handleSearch} className="flex gap-2 mt-4 max-w-2xl mx-auto">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por..."
            className="flex-grow"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? 'Buscando...' : 'Buscar'}
          </Button>
        </form>
      </header>

      <div className="grid md:grid-cols-3 flex-1 overflow-hidden">
        {/* Painel Esquerdo: Resultados da Busca */}
        <ScrollArea className="md:col-span-1 border-r">
          <div className="p-4 space-y-4">
            {error && <p className="text-destructive p-4 text-center">{error}</p>}
            {isSearching && <p className="text-muted-foreground text-center p-4">Carregando resultados...</p>}
            
            {searchResponse && (
              <>
                <p className="text-sm text-muted-foreground">{searchResponse.totalHits.toLocaleString('pt-BR')} resultados encontrados.</p>
                {searchResponse.results.map((result) => (
                  <Card 
                    key={result.id}
                    onClick={() => handleSelectTranscript(result.id)}
                    className={`cursor-pointer transition-all hover:border-primary ${selectedTranscript?.id === result.id ? 'border-primary' : ''}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{result.title}</CardTitle>
                      <CardDescription>{result.channelTitle}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p 
                        className="text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: result.snippet }} 
                      />
                      <div className="text-xs text-muted-foreground/80 mt-2">Relevância: {result.relevance.toFixed(3)}</div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Painel Direito: Conteúdo Completo */}
        <ScrollArea className="md:col-span-2">
           <div className="p-6">
            {isTranscriptLoading && <div className="text-center p-10 text-muted-foreground">Carregando transcrição...</div>}
            {selectedTranscript && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{selectedTranscript.title}</CardTitle>
                  <CardDescription>{selectedTranscript.channelTitle}</CardDescription>
                </CardHeader>
                <Separator className="my-4" />
                <CardContent>
                  <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">
                    {selectedTranscript.content}
                  </div>
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