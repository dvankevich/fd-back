export const PAGE_LIMITS = {
  firstPage: 1,
  defaultSize: 10,
  maxSize: 50,
} as const;

export type PageRequest = { page: number; limit: number };

export type Paginated<T> = PageRequest & { data: T[]; total: number };

export const toSkip = ({ page, limit }: PageRequest): number => (page - 1) * limit;

export const toPage = <T>({ rows, total, page }: { rows: T[]; total: number; page: PageRequest }): Paginated<T> => ({
  data: rows,
  total,
  page: page.page,
  limit: page.limit,
});
