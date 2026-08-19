import type { ApiModule } from "./core/http/api-module.ts";
import { areasModule } from "./modules/areas/index.ts";
import { authModule } from "./modules/auth/index.ts";
import { categoriesModule } from "./modules/categories/index.ts";
import { healthModule } from "./modules/health/index.ts";
import { ingredientsModule } from "./modules/ingredients/index.ts";
import { recipesModule } from "./modules/recipes/index.ts";
import { testimonialsModule } from "./modules/testimonials/index.ts";
import { usersModule } from "./modules/users/index.ts";

export const API_MODULES: readonly ApiModule[] = [
  healthModule,
  authModule,
  usersModule,
  categoriesModule,
  areasModule,
  ingredientsModule,
  testimonialsModule,
  recipesModule,
];
