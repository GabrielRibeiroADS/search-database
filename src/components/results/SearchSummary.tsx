"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import type { SearchResponse } from "@/lib/types";

interface SearchSummaryProps {
      searchResponse: SearchResponse;
      isDownloading: boolean;
      onDownload: () => void;
}

export function SearchSummary({ searchResponse, isDownloading, onDownload }: SearchSummaryProps) {
      return (
            <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium">
                              Resumo da Busca
                        </CardTitle>
                        <Button
                              variant="ghost"
                              size="icon"
                              onClick={onDownload}
                              className="h-8 w-8 hover:bg-primary/10"
                              aria-label="Baixar resultados"
                              disabled={isDownloading}
                        >
                              {isDownloading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                    <Download className="h-4 w-4" />
                              )}
                        </Button>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                        <div className="flex justify-between">
                              <span>Total de Resultados:</span>
                              <span className="font-bold">
                                    {searchResponse.totalHits.toLocaleString("pt-BR")}
                              </span>
                        </div>
                        {searchResponse.stats?.avgLength && (
                              <div className="flex justify-between mt-1">
                                    <span>Tamanho Médio (caracteres):</span>
                                    <span className="font-bold">
                                          {searchResponse.stats.avgLength.toLocaleString("pt-BR")}
                                    </span>
                              </div>
                        )}
                  </CardContent>
            </Card>
      );
}