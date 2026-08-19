import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import { AreaSchema } from "./view-dto/area.view-dto.ts";

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
