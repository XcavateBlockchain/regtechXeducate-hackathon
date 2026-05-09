import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ResultRow = {
  investor: string;
  wallet: string;
  module: string;
  score: string;
  scoreTone: "success" | "danger";
  result: "Passed" | "Failed";
  date: string;
  certLabel: string;
  certHref?: string | null;
};

export function ResultsTable({ rows = [] }: { rows?: ResultRow[] }) {
  return (
    <Card className="px-6 pt-5 pb-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold leading-6 text-ink-strong">
          Modules performance
        </h2>
        <Select defaultValue="all">
          <SelectTrigger className="h-11 w-[150px]">
            <SelectValue placeholder="View all" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">View all</SelectItem>
            <SelectItem value="passed">Passed only</SelectItem>
            <SelectItem value="failed">Failed only</SelectItem>
            <SelectItem value="recent">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-[rgba(149,149,131,0.08)] hover:bg-[rgba(149,149,131,0.08)]">
            <TableHead className="w-[20%]">Investor</TableHead>
            <TableHead className="w-[16%]">Wallet</TableHead>
            <TableHead className="w-[18%]">Module</TableHead>
            <TableHead className="w-[10%]">Score</TableHead>
            <TableHead className="w-[14%]">Result</TableHead>
            <TableHead className="w-[12%]">Date</TableHead>
            <TableHead className="w-[10%] text-right">
              <span className="sr-only">Certificate</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={`${row.wallet}-${row.date}`}>
                <TableCell className="text-ink-strong">
                  {row.investor}
                </TableCell>
                <TableCell className="font-mono text-ink-strong">
                  {row.wallet}
                </TableCell>
                <TableCell className="text-ink-strong">{row.module}</TableCell>
                <TableCell
                  className={cn(
                    row.scoreTone === "success"
                      ? "text-status-success"
                      : "text-status-danger-bright",
                  )}
                >
                  {row.score}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.scoreTone === "success" ? "default" : "destructive"
                    }
                  >
                    {row.result}
                  </Badge>
                </TableCell>
                <TableCell className="text-ink-subtle">{row.date}</TableCell>
                <TableCell className="text-right">
                  {row.certHref ? (
                    <Link
                      href={row.certHref}
                      target="_blank"
                      className="font-medium text-action-link transition-colors hover:underline"
                    >
                      {row.certLabel}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {row.certLabel}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No results yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
