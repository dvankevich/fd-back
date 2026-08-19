import type { Prisma, PrismaClient } from "../../../core/database/prisma.ts";
import type { TestimonialsReader } from "../domain/testimonials.port.ts";
import type { TestimonialView } from "../domain/testimonial.view.ts";

const testimonialSelect = {
  id: true,
  testimonial: true,
  owner: { select: { name: true, avatar: true } },
} as const satisfies Prisma.TestimonialSelect;

export class TestimonialsRepository implements TestimonialsReader {
  constructor(private readonly client: PrismaClient) {}

  list(): Promise<TestimonialView[]> {
    return this.client.testimonial.findMany({
      select: testimonialSelect,
      orderBy: { createdAt: "desc" },
    });
  }
}
