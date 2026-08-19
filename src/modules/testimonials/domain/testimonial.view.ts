import type { Nullable } from "../../../core/types/common.ts";

export type TestimonialView = {
  id: string;
  testimonial: string;
  owner: { name: string; avatar: Nullable<string> };
};
