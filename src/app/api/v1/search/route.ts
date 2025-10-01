// src/app/api/v1/search/route.ts
import { NextResponse } from "next/server";
import {
      SearchRequestSchema,
      SearchResponseSchema,
      SearchResultItem,
} from "@/lib/types";
import { MOCK_TRANSCRIPTS, buildSnippet } from "@/lib/mock-data";

function stripDiacritics(s: string) {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function POST(req: Request) {
      try {
            const body = await req.json();
            const parsed = SearchRequestSchema.parse(body);

            const { query, page = 1, pageSize = 20, sort, filters } = parsed;
            const normQuery = stripDiacritics(query).toLowerCase();

            // Filtro básico por canal e datas
            //     const items = MOCK_TRANSCRIPTS.filter((t) => {
            //       const byChannel =
            //         !filters?.channelId || t.channel.toLowerCase().includes(filters.channelId.toLowerCase());
            //       const after =
            //         !filters?.publishedAfter || new Date(t.publishedAt) >= new Date(filters.publishedAfter);
            //       const before =
            //         !filters?.publishedBefore || new Date(t.publishedAt) <= new Date(filters.publishedBefore);
            //       // Busca textual simples no título e no corpo
            //       const q = query.toLowerCase();
            //       const inText = t.text.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
            //       return byChannel && after && before && inText;
            //     });
            // Filtro básico por canal e datas (accent-insensitive)
            const items = MOCK_TRANSCRIPTS.filter((t) => {
                  const channelNorm = stripDiacritics(t.channel).toLowerCase();
                  const titleNorm = stripDiacritics(t.title).toLowerCase();
                  const textNorm = stripDiacritics(t.text).toLowerCase();

                  const byChannel =
                        !filters?.channelId ||
                        channelNorm.includes(stripDiacritics(filters.channelId).toLowerCase());

                  const after =
                        !filters?.publishedAfter || new Date(t.publishedAt) >= new Date(filters.publishedAfter);
                  const before =
                        !filters?.publishedBefore || new Date(t.publishedAt) <= new Date(filters.publishedBefore);

                  const inText = textNorm.includes(normQuery) || titleNorm.includes(normQuery);

                  return byChannel && after && before && inText;
            });

            // Score e snippet
            // Score e snippet
            const results: SearchResultItem[] = items.map((t) => {
                  const { snippet, positions } = buildSnippet(`${t.title}. ${t.text}`, query);
                  const titleNorm = stripDiacritics(t.title).toLowerCase();
                  const score = Math.min(1, positions.length / 5) + (titleNorm.includes(normQuery) ? 0.5 : 0);

                  return {
                        id: t.id,
                        title: t.title,
                        channel: t.channel,
                        publishedAt: t.publishedAt,
                        lengthChars: t.text.length,
                        score,
                        snippet,
                        matchPositions: positions,
                  };
            });

            // Ordenação
            const sorted = [...results].sort((a, b) => {
                  if (sort === "DATE_DESC") {
                        return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
                  }
                  if (sort === "DATE_ASC") {
                        return new Date(a.publishedAt ?? 0).getTime() - new Date(b.publishedAt ?? 0).getTime();
                  }
                  // RELEVANCE default
                  return b.score - a.score;
            });

            const totalHits = sorted.length;
            const pageCount = Math.max(1, Math.ceil(totalHits / pageSize));
            const start = (page - 1) * pageSize;
            const paged = sorted.slice(start, start + pageSize);

            const payload = {
                  totalHits,
                  stats: {
                        avgLength:
                              totalHits > 0
                                    ? Math.round(paged.reduce((acc, r) => acc + r.lengthChars, 0) / paged.length)
                                    : 0,
                  },
                  results: paged,
                  page,
                  pageSize,
                  pageCount,
            };

            // Garantir shape conforme o schema
            const safe = SearchResponseSchema.parse(payload);
            return NextResponse.json(safe);
      } catch (err) {
            if (err instanceof SyntaxError) {
                  const message = err?.message ?? "Erro na busca mock.";
                  return NextResponse.json({ message }, { status: 400 });
            } else {
                  return NextResponse.json({ message: "Erro desconhecido." }, { status: 500 });
            }
      }
}