export const isString = (value: unknown): value is string => typeof value === "string";

export const isNonEmptyString = (value: unknown): value is string => isString(value) && value.length > 0;

export const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isDefined = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined;
