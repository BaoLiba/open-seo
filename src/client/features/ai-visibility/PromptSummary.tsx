import { StatTile } from "@/client/components/StatTile";
import { Badge } from "@/client/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import type { AiResults } from "@/shared/ai-visibility";
import { DomainFavicon } from "./DomainFavicon";
import { aiRate } from "./shared";

export function PromptSummary({
  results,
}: {
  results: Pick<AiResults, "summaries" | "coverage">;
}) {
  const own = results.summaries.find((brand) => brand.own);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="grid grid-cols-3 items-center gap-4 rounded-lg border bg-card p-5 border-border">
        <StatTile
          label="Brand mentions"
          value={aiRate(own?.mentions ?? 0, own?.answers ?? 0)}
          hint={`${own?.mentions ?? 0} of ${own?.answers ?? 0} answers`}
        />
        <StatTile
          label="Owned citations"
          value={aiRate(own?.citations ?? 0, own?.answers ?? 0)}
          hint={`${own?.citations ?? 0} of ${own?.answers ?? 0} answers`}
        />
        <StatTile label="Answers" value={String(results.coverage.completed)} />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card border-border">
        <h2 className="border-b px-4 py-2 text-sm font-medium border-border">
          Brand comparison
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Mentioned</TableHead>
              <TableHead>Cited</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.summaries.map((brand) => (
              <TableRow key={brand.domain}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <DomainFavicon domain={brand.domain} />
                    {brand.name}
                    {brand.own && (
                      <Badge variant="secondary" size="sm">
                        You
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell
                  className="tabular-nums"
                  title={`${brand.mentions} of ${brand.answers} answers`}
                >
                  {aiRate(brand.mentions, brand.answers)}
                  {brand.answers > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {brand.mentions} of {brand.answers}
                    </p>
                  )}
                </TableCell>
                <TableCell
                  className="tabular-nums"
                  title={`${brand.citations} of ${brand.answers} answers`}
                >
                  {aiRate(brand.citations, brand.answers)}
                  {brand.answers > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {brand.citations} of {brand.answers}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!results.summaries.length && (
              <TableRow>
                <TableCell colSpan={3} className="py-4 text-muted-foreground">
                  No brand evidence is available for this period yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
