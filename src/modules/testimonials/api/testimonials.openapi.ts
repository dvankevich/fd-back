import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import { TestimonialSchema } from "./view-dto/testimonial.view-dto.ts";

registry.registerPath({
  method: "get",
  path: "/api/testimonials",
  tags: ["Testimonials"],
  summary: "Get list of testimonials",
  responses: {
    200: {
      description: "List of testimonials",
      content: {
        "application/json": {
          schema: z.array(TestimonialSchema),
        },
      },
    },
  },
});
