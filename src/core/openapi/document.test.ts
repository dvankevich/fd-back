import { describe, expect, it } from "vitest";
import "../../app.module.ts";
import { TOTAL_COUNT_HEADER } from "../http/paginated-response.ts";
import { HTTP_STATUS } from "../http/http-status.ts";
import { generateOpenApiDocument } from "./document.ts";

type MediaType = { schema?: { $ref?: string }; example?: unknown; examples?: unknown };

type Response = { headers?: Record<string, unknown>; content?: Record<string, MediaType> };

type Operation = { tags?: string[]; summary?: string; responses: Record<string, Response> };

const HTTP_METHODS = ["get", "post", "patch", "put", "delete"];

const PAGINATED_PATHS = [
  "/api/recipes",
  "/api/recipes/popular",
  "/api/recipes/own",
  "/api/recipes/favorites",
];

const document = generateOpenApiDocument();

const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
  Object.entries(item as Record<string, Operation>)
    .filter(([method]) => HTTP_METHODS.includes(method))
    .map(([method, operation]) => ({ path, method, operation })),
);

const jsonBody = (response: Response) => response.content?.["application/json"];

const errorResponsesWithoutExample = operations.flatMap(({ path, method, operation }) =>
  Object.entries(operation.responses)
    .filter(([status]) => Number(status) >= HTTP_STATUS.badRequest)
    .filter(([, response]) => {
      const body = jsonBody(response);
      return body === undefined || (body.example === undefined && body.examples === undefined);
    })
    .map(([status]) => `${method.toUpperCase()} ${path} ${status}`),
);

const okBodyRef = (path: string, method: string) => {
  const operation = operations.find((entry) => entry.path === path && entry.method === method);

  return jsonBody(operation?.operation.responses["200"] ?? {})?.schema?.$ref;
};

describe("generateOpenApiDocument", () => {
  it("should document every route with a tag and a summary", () => {
    const incomplete = operations
      .filter(({ operation }) => !operation.tags?.length || !operation.summary)
      .map(({ method, path }) => `${method.toUpperCase()} ${path}`);

    expect(incomplete).toEqual([]);
  });

  it("should declare every tag used by a route", () => {
    const declared = (document.tags ?? []).map(({ name }) => name);
    const used = [...new Set(operations.flatMap(({ operation }) => operation.tags ?? []))];

    expect(used.filter((tag) => !declared.includes(tag))).toEqual([]);
  });

  it("should give every error response an example of the message it returns", () => {
    expect(errorResponsesWithoutExample).toEqual([]);
  });

  it.each(PAGINATED_PATHS)("should document the total count header on GET %s", (path) => {
    const listing = operations.find((entry) => entry.path === path && entry.method === "get");

    expect(listing?.operation.responses["200"]?.headers).toHaveProperty(TOTAL_COUNT_HEADER);
  });

  it("should answer the recipe lists with named components, not inline copies", () => {
    expect(okBodyRef("/api/recipes", "get")).toBe("#/components/schemas/PaginatedRecipes");
    expect(okBodyRef("/api/recipes/popular", "get")).toBe(
      "#/components/schemas/PaginatedPopularRecipes",
    );
    expect(okBodyRef("/api/recipes/{id}", "get")).toBe("#/components/schemas/RecipeDetail");
  });
});
