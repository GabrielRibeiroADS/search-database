// src/lib/types.ts
import { z } from "zod";

// 1. SCHEMAS PARA A BUSCA
export const SearchFiltersSchema = z.object({
  publishedAfter: z.string().optional().nullable(), // ISO date string
  publishedBefore: z.string().optional().nullable(),
  channelId: z.string().optional().nullable(),
});

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  filters: SearchFiltersSchema.optional().nullable(),
  sort: z.enum(["RELEVANCE", "DATE_DESC", "DATE_ASC"]).default("RELEVANCE"),
});

export const SearchResultItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  channel: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  lengthChars: z.number().int(),
  score: z.number(),
  snippet: z.string(),
  matchPositions: z.array(z.number().int()),
});

export const SearchResponseSchema = z.object({
  totalHits: z.number().int(),
  stats: z.object({
    avgLength: z.number().int().optional().nullable(),
  }).optional().nullable(),
  results: z.array(SearchResultItemSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  pageCount: z.number().int(),
});

// 2. SCHEMAS PARA A TRANSCRIÇÃO (CHUNKS)
export const TranscriptChunkSchema = z.object({
  id: z.string(),
  offset: z.number().int(),
  text: z.string(),
  lengthChars: z.number().int(),
  matchPositions: z.array(z.number().int()),
  nextOffset: z.number().int().optional().nullable(),
});


// 3. EXPORTANDO OS TIPOS TYPESCRIPT
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type TranscriptChunk = z.infer<typeof TranscriptChunkSchema>;