import { useSearchParams } from "react-router";

import type { TFilterModel } from "@/core/types";

/**
 * A list's filters and page, kept in the URL so a list can be shared,
 * reloaded and walked back through. Filters are one `filters` parameter in
 * the model OAuth Base reads, and any change returns to the first page.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();

  const update = (change: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    change(next);
    next.delete("page");
    setParams(next, { viewTransition: true });
  };

  return {
    setFilters: (filters: TFilterModel[]) =>
      update((next) => (filters.length ? next.set("filters", JSON.stringify(filters)) : next.delete("filters"))),
    /** The link to one page, keeping the filters. */
    pageHref: (number: number) => {
      const next = new URLSearchParams(params);
      if (number > 1) next.set("page", String(number));
      else next.delete("page");
      const query = next.toString();
      return query ? `?${query}` : ".";
    },
  };
}
