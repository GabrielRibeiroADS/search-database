export function extractContentByTag(text: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "s");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

export function unescapeString(str: string | null): string {
  if (!str) return "";
  return str.replace(/\\n/g, '\n');
}

export function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function highlightFull(text: string, query: string): string {
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

export type ParsedTranscript = {
  channelTitle: string | null;
  youtubeId: string | null;
  videoId: string | null;
  chunkId: string | null;
  startTs: string | null;
  endTs: string | null;
  content: string | null;
};

export type CachedTranscript = {
  id: string;
  title: string;
  content: string;
  nextOffset: number | null;
  matchPositions: number[];
  parsedData: ParsedTranscript | null;
};

export function parseTranscriptData(rawText: string): ParsedTranscript {
  const metadataBlock = extractContentByTag(rawText, "metadata");
  const channelBlock = metadataBlock ? extractContentByTag(metadataBlock, "channel") : null;
  
  const channelTitle = channelBlock ? extractContentByTag(channelBlock, "title") : null;
  const youtubeId = channelBlock ? extractContentByTag(channelBlock, "youtube_id") : null;
  
  const videoId = metadataBlock ? extractContentByTag(metadataBlock, "video_id") : null;
  const chunkId = metadataBlock ? extractContentByTag(metadataBlock, "chunk_id") : null;
  const startTs = metadataBlock ? extractContentByTag(metadataBlock, "start_ts") : null;
  const endTs = metadataBlock ? extractContentByTag(metadataBlock, "end_ts") : null;

  const rawContent = extractContentByTag(rawText, "content");
  const content = unescapeString(rawContent);

  return {
    channelTitle,
    youtubeId,
    videoId,
    chunkId,
    startTs,
    endTs,
    content,
  };
}