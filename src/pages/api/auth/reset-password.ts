import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import {
  firstIssueMessage,
  invalidLinkRedirect,
  PASSWORD_UPDATED_MESSAGE,
  resetPasswordSchema,
} from "@/lib/services/password-reset";

function withError(message: string): string {
  return `/auth/reset-password?error=${encodeURIComponent(message)}`;
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase || !context.locals.user) {
    return context.redirect(invalidLinkRedirect);
  }

  const form = await context.request.formData();
  const password = form.get("password");
  const confirmPassword = form.get("confirmPassword");
  const parsed = resetPasswordSchema.safeParse({
    password: typeof password === "string" ? password : "",
    confirmPassword: typeof confirmPassword === "string" ? confirmPassword : "",
  });
  if (!parsed.success) {
    return context.redirect(withError(firstIssueMessage(parsed.error)));
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return context.redirect(withError(error.message));
  }

  // Update first, then sign out: the update needs the session from the email link.
  await supabase.auth.signOut();
  return context.redirect(`/auth/signin?message=${encodeURIComponent(PASSWORD_UPDATED_MESSAGE)}`);
};
