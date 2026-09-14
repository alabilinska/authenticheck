import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { codeExchangeFailureRedirect, confirmRedirectPath, invalidLinkRedirect } from "@/lib/services/password-reset";

/**
 * Target of the reset email link. The default Supabase template returns here with `?code=…` (PKCE, same browser
 * only); a customised template can send `?token_hash=…&type=recovery`, which works on any device.
 */
export const GET: APIRoute = async (context) => {
  const params = context.url.searchParams;
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return context.redirect(invalidLinkRedirect);

  const code = params.get("code");
  if (code) {
    // This endpoint is only used as the password-reset redirect, so a valid code leads to the new-password form.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return context.redirect(error ? codeExchangeFailureRedirect(error.code) : "/auth/reset-password");
  }

  const tokenHash = params.get("token_hash");
  const next = confirmRedirectPath(params.get("type"));
  if (tokenHash && next) {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (!error) return context.redirect(next);
  }
  return context.redirect(invalidLinkRedirect);
};
