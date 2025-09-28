// src/app/page.tsx
"use client";

import { useState } from 'react';
import type { SearchResponse, SearchResult, TranscriptResponse } from '@/lib/types';

export default function HomePage() {
  const [query, setQuery] = useState('');
  // Guarda a resposta completa da busca (com stats, paginação, etc.)
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  // Guarda a transcrição completa quando o usuário clica em um item
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptResponse | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar a lista de resultados (snippets)
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
      // A URL da API vem da variável de ambiente
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/search`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          page: 1,      // Você pode adicionar controles de paginação depois
          pageSize: 20, //
        }),
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
  
  // Função para buscar o texto completo de UMA transcrição
  const handleSelectTranscript = async (transcriptId: string) => {
    // Se já estiver selecionado, não faz nada
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
    <main className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-center text-cyan-400">
          Buscador de Transcrições
        </h1>
        <form onSubmit={handleSearch} className="flex gap-2 mt-4 max-w-2xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por..."
            className="flex-grow p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Painel Esquerdo: Resultados da Busca */}
        <div className="w-full md:w-1/2 lg:w-1/3 border-r border-gray-700 overflow-y-auto p-4">
          {error && <p className="text-red-400 p-4 text-center">{error}</p>}
          {isSearching && <p className="text-gray-400 text-center p-4">Carregando resultados...</p>}
          
          {searchResponse && (
            <div>
              <p className="text-sm text-gray-400 mb-4">{searchResponse.totalHits} resultados encontrados.</p>
              <div className="space-y-3">
                {searchResponse.results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectTranscript(result.id)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${selectedTranscript?.id === result.id ? 'bg-cyan-900/50' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    <h3 className="font-bold text-cyan-300">{result.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{result.channelTitle}</p>
                    <p 
                      className="text-sm text-gray-300 mt-2"
                      // O snippet pode conter HTML para highlights (ex: <b>term</b>)
                      dangerouslySetInnerHTML={{ __html: result.snippet }} 
                    />
                    <div className="text-xs text-gray-400 mt-2">Relevância: {result.relevance.toFixed(3)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Painel Direito: Conteúdo Completo da Transcrição */}
        <div className="hidden md:block w-1/2 lg:w-2/3 overflow-y-auto p-6">
           {isTranscriptLoading && <div className="text-center p-10">Carregando transcrição...</div>}
           {selectedTranscript && (
             <div>
                <h2 className="text-2xl font-bold text-cyan-200">{selectedTranscript.title}</h2>
                <p className="text-sm text-gray-400 mb-6">{selectedTranscript.channelTitle}</p>
                <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300">
                  {selectedTranscript.content}
                </div>
             </div>
           )}
           {!isTranscriptLoading && !selectedTranscript && (
             <div className="flex items-center justify-center h-full text-gray-500">
                <p>Selecione um resultado para ver a transcrição completa.</p>
             </div>
           )}
        </div>
      </div>
    </main>
  );
}