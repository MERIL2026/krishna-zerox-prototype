import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";
import { toast } from "sonner";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export type StartLoginOptions = {
  returnTo?: string;
};

export function getManusConfig() {
  const cfg = (typeof window !== "undefined" ? window.__MANUS_CONFIG__ : undefined) ?? {
    oauthPortalUrl: "",
    projectId: "",
    apiUrl: "",
    apiBrowserKey: "",
  };
  return {
    oauthPortalUrl: (cfg.oauthPortalUrl ?? "").trim(),
    projectId: (cfg.projectId ?? "").trim(),
    apiUrl: (cfg.apiUrl ?? "").trim(),
    apiBrowserKey: (cfg.apiBrowserKey ?? "").trim(),
  };
}

export function isManusOAuthConfigured(): boolean {
  const { oauthPortalUrl, projectId } = getManusConfig();
  return Boolean(oauthPortalUrl && projectId);
}

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => void startLogin({ returnTo: '/admin' })}`.
export const startLogin = async (options?: StartLoginOptions): Promise<void> => {
  let { oauthPortalUrl, projectId } = getManusConfig();

  // If not configured in memory, attempt a one-time dynamic fetch of /api/platform/config.js
  if (!oauthPortalUrl || !projectId) {
    try {
      const res = await fetch(`/api/platform/config.js?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/window\.__MANUS_CONFIG__\s*=\s*(\{[\s\S]*?\});?/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (parsed && typeof parsed === "object") {
            window.__MANUS_CONFIG__ = parsed;
            oauthPortalUrl = (parsed.oauthPortalUrl ?? "").trim();
            projectId = (parsed.projectId ?? "").trim();
          }
        }
      }
    } catch (err) {
      console.warn("[Auth] Dynamic config fetch failed:", err);
    }
  }

  if (!oauthPortalUrl || !projectId) {
    const errorMsg =
      "Manus OAuth is not configured. Missing MANUS_OAUTH_PORTAL_URL or MANUS_PROJECT_ID environment variables.";
    toast.error("Authentication Not Configured", {
      description:
        "Manus OAuth credentials are not set on this deployment. Please configure MANUS_OAUTH_PORTAL_URL and MANUS_PROJECT_ID.",
      duration: 7000,
    });
    console.error(`[Auth] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const returnTo = options?.returnTo || window.location.pathname + window.location.search;

  const nonce = crypto.randomUUID();
  const isHttps = window.location.protocol === "https:";
  const cookiePolicy = isHttps ? "SameSite=None; Secure" : "SameSite=Lax";
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; ${cookiePolicy}`;

  const state = encodeOAuthState({ redirectUri, nonce, returnTo });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", projectId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");

  window.location.href = url.toString();
};
