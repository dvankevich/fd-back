import { z } from "zod";
import { registry } from "../core/openapi/registry.ts";

export const AreaSchema = registry.register(
  "Area",
  z.object({
    id: z.string().openapi({ example: "6462a6f04c3d0ddd28897f9b" }),
    name: z.string().openapi({ example: "Ukrainian" }),
  }),
);

registry.registerPath({
  method: "get",
  path: "/api/areas",
  tags: ["Areas"],
  summary: "Get list of recipe areas (regions of origin)",
  responses: {
    200: {
      description: "List of areas",
      content: {
        "application/json": {
          schema: z.array(AreaSchema),
        },
      },
    },
  },
});
