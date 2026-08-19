import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import { PAGE_LIMITS } from "../../../../core/paginator.ts";

export const PageSchema = z.coerce
  .number()
  .int()
  .positive()
  .default(PAGE_LIMITS.firstPage)
  .openapi({ example: PAGE_LIMITS.firstPage });

export const LimitSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(PAGE_LIMITS.maxSize)
  .default(PAGE_LIMITS.defaultSize)
  .openapi({ example: PAGE_LIMITS.defaultSize });

export const PaginationQuerySchema = registry.register(
  "PaginationQuery",
  z.object({
    page: PageSchema,
    limit: LimitSchema,
  }),
);

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
