import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { AreaView } from "../../domain/area.view.ts";

export const AreaSchema = registry.register(
  "Area",
  z.object({
    id: z.string().openapi({ example: "6462a6f04c3d0ddd28897f9b" }),
    name: z.string().openapi({ example: "Ukrainian" }),
  }) satisfies z.ZodType<AreaView>,
);
