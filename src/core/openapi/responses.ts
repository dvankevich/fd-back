import { z } from "zod";
import { VALIDATION_MESSAGE } from "../http/validate.middleware.ts";
import { registry } from "./registry.ts";

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.string().openapi({ example: "Invalid credentials" }),
  }),
);

export const ValidationErrorSchema = registry.register(
  "ValidationError",
  z.object({
    error: z.string().openapi({ example: VALIDATION_MESSAGE.body }),
    details: z.record(z.string(), z.array(z.string())).openapi({
      example: {
        email: ["Invalid email address"],
        password: ["Too small: expected string to have >=8 characters"],
      },
    }),
  }),
);

export const jsonResponse = <T extends z.ZodType>({
  description,
  schema,
  example,
}: {
  description: string;
  schema: T;
  example?: z.output<T>;
}) => ({
  description,
  content: { "application/json": { schema, ...(example === undefined ? {} : { example }) } },
});

export const errorResponse = ({ description, error }: { description: string; error: string }) =>
  jsonResponse({ description, schema: ErrorSchema, example: { error } });

export const errorExamples = ({
  description,
  errors,
}: {
  description: string;
  errors: Record<string, string>;
}) => ({
  description,
  content: {
    "application/json": {
      schema: ErrorSchema,
      examples: Object.fromEntries(
        Object.entries(errors).map(([name, error]) => [name, { value: { error } }]),
      ),
    },
  },
});

type ValidationDetails = Record<string, readonly string[]>;

const toDetailsExample = (details: ValidationDetails): Record<string, string[]> =>
  Object.fromEntries(Object.entries(details).map(([field, messages]) => [field, [...messages]]));

export const validationErrorResponse = ({
  description,
  details,
}: {
  description: string;
  details: ValidationDetails;
}) =>
  jsonResponse({
    description,
    schema: ValidationErrorSchema,
    example: { error: VALIDATION_MESSAGE.body, details: toDetailsExample(details) },
  });

export const validationErrorExamples = ({
  description,
  details,
}: {
  description: string;
  details: Record<string, ValidationDetails>;
}) => ({
  description,
  content: {
    "application/json": {
      schema: ValidationErrorSchema,
      examples: Object.fromEntries(
        Object.entries(details).map(([name, fields]) => [
          name,
          { value: { error: VALIDATION_MESSAGE.body, details: toDetailsExample(fields) } },
        ]),
      ),
    },
  },
});
