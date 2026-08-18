import { z } from "zod";
import { registry } from "../openapi/registry.ts";

export const TestimonialSchema = registry.register(
  "Testimonial",
  z.object({
    id: z.string().openapi({ example: "647495d0c825f1570b04182d" }),
    testimonial: z.string().openapi({
      example:
        "Foodies has transformed my cooking experience! With its diverse recipe collection...",
    }),
    owner: z.object({
      name: z.string().openapi({ example: "GoIT" }),
      avatar: z.string().nullable().openapi({ example: null }),
    }),
  }),
);

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
