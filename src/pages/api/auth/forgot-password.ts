import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { confirmUrl, firstIssueMessage, forgotPasswordSchema } from "@/lib/services/password-reset";

function withError(message: string): string {
  return `/auth/forgot-password?error=${encodeURIComponent(message)}`;
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email");
  const parsed = forgotPasswordSchema.safeParse({ email: typeof email === "string" ? email : "" });
  if (!parsed.success) {
    return context.redirect(withError(firstIssueMessage(parsed.error)));
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(withError("Supabase is not configured"));
  }
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(context.url.origin),
  });
  if (error) {
    return context.redirect(withError(error.message));
  }

  // Same answer whether or not the account exists, so the form cannot be used to probe for emails.
  return context.redirect("/auth/forgot-password?sent=1");
};
