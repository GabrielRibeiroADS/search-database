"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, RotateCcw, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import type { ParsedTranscript } from "@/lib/transcript-utils";

interface TranscriptPanelProps {
      title: string;
      content: string;
      parsedData: ParsedTranscript | null;
      isLoading: boolean;
      isLoadingMore: boolean;
      hasMore: boolean;
      lastChunkRef: (node: HTMLDivElement) => void;
      onRefresh: () => void;
      onClose: () => void;
}

export function TranscriptPanel({
      title,
      content,
      parsedData,
      isLoading,
      isLoadingMore,
      hasMore,
      lastChunkRef,
      onRefresh,
      onClose,
}: TranscriptPanelProps) {
      return (
            <Card>
                  <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                        <CardTitle className="text-2xl">{title}</CardTitle>
                        <div className="flex gap-1 shrink-0">
                              <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-primary/10"
                                    onClick={onRefresh}
                                    aria-label="Recarregar transcrição"
                                    disabled={isLoading}
                              >
                                    <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                              </Button>
                              <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-destructive/10"
                                    onClick={onClose}
                                    aria-label="Fechar transcrição"
                              >
                                    <X className="h-4 w-4" />
                              </Button>
                        </div>
                  </CardHeader>
                  <CardContent>
                        {isLoading ? (
                              <div className="text-center p-10">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                                    <p className="text-muted-foreground">Buscando transcrição...</p>
                              </div>
                        ) : (
                              <>
                                    {parsedData && (
                                          <div className="space-y-2 text-sm text-muted-foreground mb-6">
                                                <h3 className="font-semibold text-foreground text-base">Metadados Extraídos</h3>
                                                {parsedData.channelTitle && (
                                                      <div className="flex justify-between">
                                                            <span>Canal:</span>
                                                            <a
                                                                  href={`https://www.youtube.com/channel/${parsedData.youtubeId}`}
                                                                  target="_blank"
                                                                  rel="noopener noreferrer"
                                                                  className="font-mono text-blue-500 hover:underline"
                                                            >
                                                                  {parsedData.channelTitle}
                                                            </a>
                                                      </div>
                                                )}
                                                {parsedData.youtubeId && (
                                                      <div className="flex justify-between">
                                                            <span>ID do Canal:</span>
                                                            <span className="font-mono">{parsedData.youtubeId}</span>
                                                      </div>
                                                )}
                                                {parsedData.videoId && (
                                                      <div className="flex justify-between">
                                                            <span>ID do Vídeo:</span>
                                                            <a
                                                                  href={`https://www.youtube.com/watch?v=${parsedData.videoId}`}
                                                                  target="_blank"
                                                                  rel="noopener noreferrer"
                                                                  className="font-mono text-blue-500 hover:underline"
                                                            >
                                                                  {parsedData.videoId}
                                                            </a>
                                                      </div>
                                                )}
                                                {parsedData.chunkId && (
                                                      <div className="flex justify-between">
                                                            <span>ID do Chunk:</span>
                                                            <span className="font-mono">{parsedData.chunkId}</span>
                                                      </div>
                                                )}
                                                {parsedData.startTs && (
                                                      <div className="flex justify-between">
                                                            <span>Timestamp Inicial:</span>
                                                            <span className="font-mono">{parsedData.startTs}</span>
                                                      </div>
                                                )}
                                                {parsedData.endTs && (
                                                      <div className="flex justify-between">
                                                            <span>Timestamp Final:</span>
                                                            <span className="font-mono">{parsedData.endTs}</span>
                                                      </div>
                                                )}
                                          </div>
                                    )}

                                    <Separator className="my-4" />

                                    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:my-2">
                                          <ReactMarkdown
                                                rehypePlugins={[rehypeRaw]}
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                      p: ({ node, children, ...props }) => {
                                                            return <p className="leading-relaxed" {...props}>{children}</p>;
                                                      },
                                                      strong: ({ node, children, ...props }) => {
                                                            return <strong className="font-bold text-foreground" {...props}>{children}</strong>;
                                                      },
                                                }}
                                          >
                                                {content}
                                          </ReactMarkdown>
                                    </div>

                                    <div ref={lastChunkRef} className="h-10" />

                                    {isLoadingMore && (
                                          <div className="text-center py-4">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                          </div>
                                    )}

                                    {!hasMore && (
                                          <p className="text-center text-sm text-muted-foreground py-4">
                                                Fim da transcrição.
                                          </p>
                                    )}
                              </>
                        )}
                  </CardContent>
            </Card>
      );
}