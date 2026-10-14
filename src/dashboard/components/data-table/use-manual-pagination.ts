import type { PaginationState, Updater } from "@tanstack/react-table";
import { functionalUpdate } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

// `resetKey` falls back to page 1 whenever it changes, and remembers the page
// for that key (one deep), so returning to an identical filter state returns
// to the same page.
export function useManualPagination({
  pageSize: initialPageSize = 20,
  resetKey = "",
}: {
  pageSize?: number;
  resetKey?: string;
} = {}) {
  const [state, setState] = useState({
    key: resetKey,
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: state.key === resetKey ? state.pageIndex : 0,
      pageSize: state.pageSize,
    }),
    [state, resetKey],
  );

  const onPaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      setState((prev) => {
        const current: PaginationState = {
          pageIndex: prev.key === resetKey ? prev.pageIndex : 0,
          pageSize: prev.pageSize,
        };
        return { key: resetKey, ...functionalUpdate(updater, current) };
      });
    },
    [resetKey],
  );

  return {
    pagination,
    onPaginationChange,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };
}
