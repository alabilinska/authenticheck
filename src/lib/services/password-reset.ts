import { z } from "astro/zod";

export const MIN_PASSWORD_LENGTH = 6;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email address" })),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, { error: `Password must be at least ${String(MIN_PASSWORD_LENGTH)} characters` }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Where a verified email link sends the user; null for link types this app does not handle. */
export function confirmRedirectPath(type: string | null): string | null {
  return type === "recovery" ? "/auth/reset-password" : null;
}

/** The URL the reset email links back to; must be on the Supabase Redirect URLs allowlist. */
export function confirmUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/api/auth/confirm`;
}

/** The first validation message, for the `?error=` redirect. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues.at(0)?.message ?? "Invalid input";
}

export const INVALID_LINK_MESSAGE = "This reset link is invalid or has expired. Request a new one.";
export const PASSWORD_UPDATED_MESSAGE = "Password updated — sign in with your new password.";

export const OTHER_BROWSER_MESSAGE =
  "Open the reset link in the same browser where you requested it, or request a new link from this browser.";

/** Where a missing session or a bad email link sends the user. */
export const invalidLinkRedirect = `/auth/forgot-password?error=${encodeURIComponent(INVALID_LINK_MESSAGE)}`;

/**
 * Where a failed code exchange sends the user. The default Supabase link uses PKCE: its code verifier lives in a
 * cookie of the browser that requested the reset, so the link fails in any other browser.
 */
export function codeExchangeFailureRedirect(errorCode: string | undefined): string {
  if (errorCode === "pkce_code_verifier_not_found") {
    return `/auth/forgot-password?error=${encodeURIComponent(OTHER_BROWSER_MESSAGE)}`;
  }
  return invalidLinkRedirect;
}
