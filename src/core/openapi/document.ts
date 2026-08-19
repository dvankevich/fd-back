import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.ts";

// Side-effect imports — registry уже повністю ініціалізований
import "../../validators/users.validator.ts";
import "../../validators/recipes.validator.ts";

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
