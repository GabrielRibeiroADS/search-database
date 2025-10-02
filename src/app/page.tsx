"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchFilters } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<"RELEVANCE" | "DATE_DESC" | "DATE_ASC">("RELEVANCE");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      alert("Por favor, digite um termo para buscar.");
      return;
    }

    // Constrói os parâmetros da URL
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("sort", sort);
    
    if (filters.channelId) params.set("channelId", filters.channelId);
    if (filters.publishedAfter) params.set("publishedAfter", filters.publishedAfter);

    // Navega para a página de resultados
    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold mb-2">
            Buscador de Transcrições
          </CardTitle>
          <CardDescription className="text-lg">
            Pesquise em milhares de transcrições de vídeos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">O que você está procurando?</Label>
              <textarea
                id="search-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite sua busca aqui..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="filters">
                <AccordionTrigger>Filtros Avançados e Ordenação</AccordionTrigger>
                <AccordionContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Canal ID</Label>
                    <Input
                      placeholder="ID do Canal do YouTube"
                      value={filters.channelId || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, channelId: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Publicado Após</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal min-w-0 overflow-hidden",
                            !filters.publishedAfter && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1 h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {filters.publishedAfter
                              ? format(new Date(filters.publishedAfter), "PPP", { locale: ptBR })
                              : "Escolha uma data"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={
                            filters.publishedAfter
                              ? new Date(filters.publishedAfter)
                              : undefined
                          }
                          onSelect={(date) =>
                            setFilters({
                              ...filters,
                              publishedAfter: date?.toISOString(),
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Ordenar Por</Label>
                    <Select
                      value={sort}
                      onValueChange={(value: "RELEVANCE" | "DATE_DESC" | "DATE_ASC") =>
                        setSort(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RELEVANCE">Relevância</SelectItem>
                        <SelectItem value="DATE_DESC">Mais Recentes</SelectItem>
                        <SelectItem value="DATE_ASC">Mais Antigos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="submit" size="lg" className="w-full">
              <Search className="mr-2 h-5 w-5" />
              Buscar Transcrições
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}