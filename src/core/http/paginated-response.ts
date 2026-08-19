import type { Response } from "express";
import type { Paginated } from "../paginator.ts";
import { HTTP_STATUS } from "./http-status.ts";

export const TOTAL_COUNT_HEADER = "X-Total-Count";

export const sendPaginated = <T>(res: Response<Paginated<T>>, page: Paginated<T>): void => {
  res.setHeader(TOTAL_COUNT_HEADER, String(page.total));
  res.status(HTTP_STATUS.ok).json(page);
};
