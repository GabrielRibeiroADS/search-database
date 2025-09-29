// src/lib/mock-data.ts
export type MockTranscript = {
  id: string;
  title: string;
  channel: string;
  publishedAt: string; // ISO
  text: string;
};

export const MOCK_TRANSCRIPTS: MockTranscript[] = [
  {
    id: "vid-001",
    title: "Introdução ao Buscador de Transcrições",
    channel: "Canal Dev BR",
    publishedAt: "2025-08-15T12:00:00.000Z",
    text:
      "Bem-vindo ao buscador de transcrições. Este vídeo explica como pesquisar por palavras-chave, aplicar filtros por canal e data, e visualizar transcrições completas com carregamento incremental. " +
      "Você pode buscar por termos como 'Next.js', 'índice invertido' ou 'relevância'. Também mostramos como os resultados são ordenados por relevância, mais recentes e mais antigos. " +
      "No final, há uma demonstração prática com exemplos reais para você acompanhar passo a passo.",
  },
  {
    id: "vid-002",
    title: "Estratégias de Indexação e Ranking",
    channel: "Dados & Busca",
    publishedAt: "2025-05-02T09:30:00.000Z",
    text:
      "Nesta sessão, cobrimos estratégias de indexação, normalização de texto, tokenização e ranqueamento. " +
      "Discutimos BM25, TF-IDF e considerações de performance para bancos de dados de transcrições longas. " +
      "Também abordamos técnicas de snippet para destacar as ocorrências do termo pesquisado no contexto, com <mark>realce</mark> seguro.",
  },
  {
    id: "vid-003",
    title: "Paginação, Chunks e Lazy Loading",
    channel: "Canal Dev BR",
    publishedAt: "2024-12-20T18:45:00.000Z",
    text:
      "Falamos sobre paginação de resultados e carregamento incremental de transcrições grandes por chunk. " +
      "Mostramos como utilizar offset, limit e como calcular o nextOffset até atingir o fim da transcrição. " +
      "Também exemplificamos a sinalização de 'Fim da transcrição.' quando não há mais conteúdo para carregar.",
  },
];

// Utilitário simples para gerar snippet com <mark> ao redor da primeira ocorrência
// export function buildSnippet(body: string, query: string, radius = 80): { snippet: string; positions: number[] } {
//   const safeQuery = query.trim();
//   if (!safeQuery) {
//     const start = body.slice(0, radius * 2);
//     return { snippet: start + (body.length > start.length ? "..." : ""), positions: [] };
//   }

//   const lower = body.toLowerCase();
//   const q = safeQuery.toLowerCase();
//   const positions: number[] = [];

//   let idx = 0;
//   while (true) {
//     idx = lower.indexOf(q, idx);
//     if (idx === -1) break;
//     positions.push(idx);
//     idx += q.length;
//   }

//   const first = positions[0] ?? 0;
//   const from = Math.max(0, first - radius);
//   const to = Math.min(body.length, first + q.length + radius);
//   const slice = body.slice(from, to);

//   const highlighted = slice.replace(new RegExp(`(${escapeRegExp(safeQuery)})`, "ig"), "<mark>$1</mark>");
//   const prefix = from > 0 ? "..." : "";
//   const suffix = to < body.length ? "..." : "";
//   return { snippet: `${prefix}${highlighted}${suffix}`, positions };
// }

// function escapeRegExp(s: string) {
//   return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// Utilitário simples para gerar snippet com <mark> ao redor das ocorrências, ignorando acentos
export function buildSnippet(body: string, query: string, radius = 80): { snippet: string; positions: number[] } {
  const safeQuery = query.trim();
  if (!safeQuery) {
    const start = body.slice(0, radius * 2);
    return { snippet: start + (body.length > start.length ? "..." : ""), positions: [] };
  }

  const bodyNorm = stripDiacritics(body).toLowerCase();
  const qNorm = stripDiacritics(safeQuery).toLowerCase();

  // Coleta todas as posições no texto normalizado
  const positions: number[] = [];
  let idx = 0;
  while (true) {
    idx = bodyNorm.indexOf(qNorm, idx);
    if (idx === -1) break;
    positions.push(idx);
    idx += qNorm.length;
  }

  // Define a janela do snippet ao redor da 1ª ocorrência (ou início se não achar)
  const first = positions[0] ?? 0;
  const from = Math.max(0, first - radius);
  const to = Math.min(body.length, first + qNorm.length + radius);

  const origWindow = body.slice(from, to);
  const normWindow = bodyNorm.slice(from, to);

  // Destaca todas as ocorrências dentro da janela, respeitando índices do texto original
  const highlighted = highlightAccentInsensitive(origWindow, normWindow, qNorm);

  const prefix = from > 0 ? "..." : "";
  const suffix = to < body.length ? "..." : "";
  return { snippet: `${prefix}${highlighted}${suffix}`, positions };
}

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function highlightAccentInsensitive(origWindow: string, normWindow: string, qNorm: string) {
  if (!qNorm) return origWindow;

  let res = "";
  let p = 0;
  const qLen = qNorm.length;

  while (true) {
    const found = normWindow.indexOf(qNorm, p);
    if (found === -1) break;

    // adiciona o trecho anterior sem destaque
    res += origWindow.slice(p, found);
    // adiciona o trecho destacado usando índices do texto original
    res += `<mark>${origWindow.slice(found, found + qLen)}</mark>`;
    p = found + qLen;
  }
  res += origWindow.slice(p);
  return res;
}