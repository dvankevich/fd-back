import type { TestimonialView } from "./testimonial.view.ts";

export interface TestimonialsReader {
  list(): Promise<TestimonialView[]>;
}
