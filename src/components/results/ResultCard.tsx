"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SearchResultItem } from "@/lib/types";

interface ResultCardProps {
      result: SearchResultItem;
      isSelected: boolean;
      onClick: () => void;
}

export function ResultCard({ result, isSelected, onClick }: ResultCardProps) {
      return (
            <Card
                  onClick={onClick}
                  className={`cursor-pointer transition-all hover:border-primary ${isSelected ? "border-primary" : ""
                        }`}
            >
                  <CardHeader className="pb-2">
                        <CardTitle className="text-base">{result.title}</CardTitle>
                        <CardDescription>{result.channel}</CardDescription>
                  </CardHeader>
                  <CardContent>
                        <p
                              className="text-sm text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                  </CardContent>
                  <CardFooter>
                        <div className="text-xs text-muted-foreground/80">
                              Relevância: {result.score.toFixed(3)}
                        </div>
                  </CardFooter>
            </Card>
      );
}