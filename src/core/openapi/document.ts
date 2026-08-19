import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.ts";

export { registry };

const API_TAGS = [
  { name: "Auth", description: "Registration, login, refresh and logout" },
  { name: "Users", description: "Profiles, avatar and follows" },
  { name: "Recipes", description: "Recipes, own recipes and favorites" },
  { name: "Categories", description: "Category dictionary" },
  { name: "Areas", description: "Area dictionary" },
  { name: "Ingredients", description: "Ingredient dictionary" },
  { name: "Testimonials", description: "Testimonials shown on the landing page" },
];

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Foodies API",
      version: "1.0.0",
      description:
        "Foodies REST API. Auth: Bearer access token. Refresh token: httpOnly cookie and/or JSON body.",
    },
    servers: [{ url: "/" }],
    tags: API_TAGS,
  });
}
