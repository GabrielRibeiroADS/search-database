// src/app/api/v1/transcripts/[id]/route.ts
import { NextResponse } from "next/server";
import { TranscriptChunkSchema } from "@/lib/types";
import { MOCK_TRANSCRIPTS } from "@/lib/mock-data";

export async function GET(  req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "50000", 10);

    const item = MOCK_TRANSCRIPTS.find((t) => t.id === id);
    if (!item) {
      return NextResponse.json({ message: "Transcrição não encontrada." }, { status: 404 });
    }

    const text = item.text;
    const from = Math.max(0, isFinite(offset) ? offset : 0);
    const to = Math.min(text.length, from + (isFinite(limit) ? limit : 50000));
    const chunkText = text.slice(from, to);

    const nextOffset = to < text.length ? to : null;

    const payload = {
      id: item.id,
      offset: from,
      text: chunkText,
      lengthChars: chunkText.length,
      matchPositions: [], // não usado no render atual; pode ser preenchido no futuro
      nextOffset: nextOffset ?? null,
    };

    const safe = TranscriptChunkSchema.parse(payload);
    return NextResponse.json(safe);
  } catch (err: any) {
    const message = err?.message ?? "Erro ao obter transcrição mock.";
    return NextResponse.json({ message }, { status: 400 });
  }
}