export const DEFAULT_PAGE_SIZE = 25;

export type PaginatedResult<T> = {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function parsePage(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function pageOffset(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return (Math.max(1, page) - 1) * pageSize;
}

export function paginatedResult<T>(items: T[], totalItems: number, page: number, pageSize = DEFAULT_PAGE_SIZE): PaginatedResult<T> {
  return {
    items,
    totalItems,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}
