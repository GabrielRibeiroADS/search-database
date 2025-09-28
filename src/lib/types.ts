// src/lib/types.ts
import { z } from "zod";

// Schemas para a requisição de busca
export const SearchFiltersSchema = z.object({
  channelId: z.string().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  filters: SearchFiltersSchema.optional(),
});

// Schemas para a resposta da busca
export const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  snippet: z.string(),
  relevance: z.number(),
  length: z.number(),
  publishedAt: z.string(), // Usar string para datas ISO
});

export const SearchStatsSchema = z.object({
  averageLength: z.number(),
  dateDistribution: z.record(z.string(), z.number()),
});

export const SearchResponseSchema = z.object({
  totalHits: z.number(),
  page: z.number(),
  pageSize: z.number(),
  stats: SearchStatsSchema,
  results: z.array(SearchResultSchema),
});

// Schema para a resposta da transcrição completa
export const TranscriptResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  content: z.string(),
  length: z.number(),
  publishedAt: z.string(),
});

// Exportando os tipos inferidos para usar no TypeScript
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type TranscriptResponse = z.infer<typeof TranscriptResponseSchema>;