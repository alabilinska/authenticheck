import { describe, expect, it } from "vitest";
import {
  codeExchangeFailureRedirect,
  confirmRedirectPath,
  confirmUrl,
  firstIssueMessage,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./password-reset";

describe("forgotPasswordSchema", () => {
  it("accepts a valid email and trims it", () => {
    expect(forgotPasswordSchema.parse({ email: "  buyer@example.com " })).toEqual({ email: "buyer@example.com" });
  });

  it.each(["", "buyer", "buyer@", "@example.com"])("rejects %j with a readable message", (email) => {
    const result = forgotPasswordSchema.safeParse({ email });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssueMessage(result.error)).toBe("Enter a valid email address");
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords of at least 6 characters", () => {
    expect(resetPasswordSchema.safeParse({ password: "secret1", confirmPassword: "secret1" }).success).toBe(true);
  });

  it("rejects a short password", () => {
    const result = resetPasswordSchema.safeParse({ password: "abc", confirmPassword: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssueMessage(result.error)).toBe("Password must be at least 6 characters");
  });

  it("rejects a mismatched confirmation", () => {
    const result = resetPasswordSchema.safeParse({ password: "secret1", confirmPassword: "secret2" });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssueMessage(result.error)).toBe("Passwords do not match");
  });
});

describe("confirmRedirectPath", () => {
  it("sends a recovery link to the new-password form", () => {
    expect(confirmRedirectPath("recovery")).toBe("/auth/reset-password");
  });

  it.each(["signup", "email", "magiclink", "", null])("does not handle %j", (type) => {
    expect(confirmRedirectPath(type)).toBeNull();
  });
});

describe("confirmUrl", () => {
  it.each([
    [
      "https://authenticheck.alicja-a-bilinska.workers.dev",
      "https://authenticheck.alicja-a-bilinska.workers.dev/api/auth/confirm",
    ],
    ["http://localhost:4321/", "http://localhost:4321/api/auth/confirm"],
  ])("builds the confirm URL from %s", (origin, expected) => {
    expect(confirmUrl(origin)).toBe(expected);
  });
});

describe("codeExchangeFailureRedirect", () => {
  it("asks to use the requesting browser when the PKCE code verifier is missing", () => {
    expect(decodeURIComponent(codeExchangeFailureRedirect("pkce_code_verifier_not_found"))).toContain(
      "same browser where you requested it",
    );
  });

  it.each(["otp_expired", "flow_state_not_found", undefined])("treats %j as an invalid or expired link", (code) => {
    expect(decodeURIComponent(codeExchangeFailureRedirect(code))).toContain("invalid or has expired");
  });
});
