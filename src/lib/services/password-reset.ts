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
