import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { TestimonialView } from "../../domain/testimonial.view.ts";

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
  }) satisfies z.ZodType<TestimonialView>,
);
