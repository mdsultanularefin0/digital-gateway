import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PaginationBar({ page, pageCount, total, pageSize, onPrev, onNext }: Props) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 mt-4 text-sm text-muted-foreground">
      <span>
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          Page <span className="font-medium text-foreground">{page}</span> / {pageCount}
        </span>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= pageCount}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
