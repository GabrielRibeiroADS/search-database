"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface SearchHeaderProps {
      query: string;
}

export function SearchHeader({ query }: SearchHeaderProps) {
      const router = useRouter();

      return (
            <header className="p-4 border-b bg-background sticky top-0 z-10">
                  <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <div className="flex items-center gap-4">
                              <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push('/')}
                                    className="gap-2"
                              >
                                    <ArrowLeft className="h-4 w-4" />
                                    Nova Busca
                              </Button>
                              <div>
                                    <h1 className="text-xl font-bold">Resultados da Busca</h1>
                                    <p className="text-sm text-muted-foreground">
                                          Buscando por: <span className="font-medium text-foreground">{query}</span>
                                    </p>
                              </div>
                        </div>
                  </div>
            </header>
      );
}