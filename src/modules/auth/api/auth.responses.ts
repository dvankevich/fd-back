import { errorExamples } from "../../../core/openapi/responses.ts";
import { AUTH_MESSAGE } from "../domain/auth.messages.ts";

export const unauthorizedResponse = errorExamples({
  description: "Missing or invalid access token",
  errors: {
    missing: AUTH_MESSAGE.authenticationRequired,
    invalid: AUTH_MESSAGE.invalidAccessToken,
    unknownUser: AUTH_MESSAGE.unknownUser,
  },
});
