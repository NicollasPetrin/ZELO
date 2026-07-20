import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import type { SearchParams } from "@/lib/search";

function pageHref(searchParams: SearchParams, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `?${query}` : "?";
}

export function Pagination({
  page,
  pageCount,
  totalItems,
  searchParams,
}: {
  page: number;
  pageCount: number;
  totalItems: number;
  searchParams: SearchParams;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Paginacao">
      <p className="text-sm text-slate-600">
        Pagina <span className="font-semibold text-slate-950">{page}</span> de {pageCount} - {totalItems} registros
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={pageHref(searchParams, page - 1)} className={buttonClassName("secondary", "sm")}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link href={pageHref(searchParams, page + 1)} className={buttonClassName("secondary", "sm")}>
            Proxima
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
