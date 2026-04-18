import { useEffect, useMemo, useState } from "react";

/**
 * Simple client-side pagination over an in-memory array.
 * Auto-resets to page 1 when the underlying list size changes (e.g., filters).
 */
export function usePagination<T>(items: T[], pageSize = 25) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    page: safePage,
    pageCount,
    pageSize,
    total,
    paged,
    setPage,
    next: () => setPage((p) => Math.min(pageCount, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
  };
}
