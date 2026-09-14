import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";
import { invalidLinkRedirect } from "@/lib/services/password-reset";

const PROTECTED_ROUTES = ["/dashboard", "/verifications"];

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
  } else {
    context.locals.user = null;
  }

  // The new-password form needs the session from the reset email link, not a normal sign-in.
  if (context.url.pathname.startsWith("/auth/reset-password") && !context.locals.user) {
    return context.redirect(invalidLinkRedirect);
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  return next();
});
