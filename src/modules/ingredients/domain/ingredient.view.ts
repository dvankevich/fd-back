import type { Nullable } from "../../../core/types/common.ts";

export type IngredientView = {
  id: string;
  name: string;
  description: Nullable<string>;
  img: Nullable<string>;
};
