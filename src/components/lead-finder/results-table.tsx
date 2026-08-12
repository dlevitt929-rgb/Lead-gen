"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Phone, Globe, Gauge, BookmarkPlus, BookmarkCheck, Loader2, ExternalLink, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WebsiteStatusBadge } from "@/components/shared/website-status-badge";
import { Badge } from "@/components/ui/badge";
import type { SearchResultRow } from "@/types/search";

export function ResultsTable({
  rows,
  savingIds,
  auditingIds,
  verifyingIds,
  onSave,
  onAudit,
  onVerify,
}: {
  rows: SearchResultRow[];
  savingIds: Set<string>;
  auditingIds: Set<string>;
  verifyingIds: Set<string>;
  onSave: (businessId: string) => void;
  onAudit: (businessId: string) => void;
  onVerify: (businessId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Score</TableHead>
            <TableHead>Business</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const phone = row.contacts.find((c) => c.type === "PHONE")?.value;
            const isSaving = savingIds.has(row.business.id);
            const isAuditing = auditingIds.has(row.business.id);
            const isVerifying = verifyingIds.has(row.business.id);

            return (
              <TableRow key={row.business.id}>
                <TableCell>
                  <ScoreBadge score={row.score} quality={row.quality} size="sm" />
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/business/${row.business.id}`} className="font-medium hover:underline">
                      {row.business.name}
                    </Link>
                    {row.isNew && (
                      <Badge variant="secondary" className="text-[10px]">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{row.business.categoryPrimary}</div>
                </TableCell>
                <TableCell className="max-w-40 whitespace-normal text-sm text-muted-foreground">
                  <div className="flex items-start gap-1">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>{[row.location?.suburb, row.location?.city].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {row.business.rating ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="size-3.5 fill-warning text-warning" />
                      {row.business.rating.toFixed(1)}
                      <span className="text-xs text-muted-foreground">({row.business.reviewCount ?? 0})</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <WebsiteStatusBadge website={row.website} absenceStatus={row.business.websiteAbsenceStatus} />
                    {row.website && !row.website.status && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={isAuditing} onClick={() => onAudit(row.business.id)}>
                        {isAuditing ? <Loader2 className="size-3 animate-spin" /> : <Gauge className="size-3" />}
                        Audit
                      </Button>
                    )}
                    {!row.website && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={isVerifying} onClick={() => onVerify(row.business.id)}>
                        {isVerifying ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                        Verify
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {phone ? (
                    <span className="flex items-center gap-1 text-sm">
                      <Phone className="size-3.5 text-muted-foreground" />
                      {phone}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No public number found</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {row.website?.url && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <a href={row.website.url} target="_blank" rel="noreferrer">
                          <Globe className="size-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant={row.isSaved ? "secondary" : "outline"} disabled={isSaving || row.isSaved} onClick={() => onSave(row.business.id)}>
                      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : row.isSaved ? <BookmarkCheck className="size-3.5" /> : <BookmarkPlus className="size-3.5" />}
                      {row.isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/business/${row.business.id}`}>
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
