import type { TestimonialsReader } from "../domain/testimonials.port.ts";
import type { TestimonialView } from "../domain/testimonial.view.ts";

export class TestimonialsService {
  constructor(private readonly testimonials: TestimonialsReader) {}

  list(): Promise<TestimonialView[]> {
    return this.testimonials.list();
  }
}
