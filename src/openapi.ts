import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./openapi/registry.ts";

// Side-effect imports — registry уже повністю ініціалізований
import "./validators/auth.validator.ts";
import "./validators/users.validator.ts";
import "./validators/categories.validator.ts";
import "./validators/areas.validator.ts";
import "./validators/ingredients.validator.ts";
import "./validators/testimonials.validator.ts";
import "./validators/recipes.validator.ts";

export { registry };

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
  });
}
