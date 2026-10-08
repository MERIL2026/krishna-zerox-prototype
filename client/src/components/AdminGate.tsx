import { useState } from "react";
import { LockKeyhole, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startLogin, isManusOAuthConfigured } from "@/const";
import type { User } from "../../../drizzle/schema";

interface AdminGateProps {
  loading?: boolean;
  user?: User | null;
  onLogout?: () => void | Promise<void>;
}

export default function AdminGate({ loading, user, onLogout }: AdminGateProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const isConfigured = typeof window !== "undefined" ? isManusOAuthConfigured() : true;

  if (loading) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <span className="admin-gate-icon">
            <LockKeyhole size={22} />
          </span>
          <h1>Checking access…</h1>
          <p>Verifying your Paperlane workspace session.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleSignIn = async () => {
      if (isLoggingIn) return;
      setIsLoggingIn(true);
      try {
        await startLogin({ returnTo: window.location.pathname });
      } catch (err: unknown) {
        setIsLoggingIn(false);
        const message = err instanceof Error ? err.message : "Manus OAuth is not configured";
        toast.error("Authentication Not Configured", {
          description: message,
          duration: 7000,
        });
      }
    };

    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <span className="admin-gate-icon">
            <LockKeyhole size={22} />
          </span>
          <h1>Operations sign-in</h1>
          <p>Sign in with your authorized Paperlane account to open the shop workspace.</p>
          <button
            type="button"
            className="admin-primary"
            onClick={handleSignIn}
            disabled={isLoggingIn}
            aria-busy={isLoggingIn}
            aria-label="Sign in to continue"
            style={{ width: "100%", justifyContent: "center", cursor: isLoggingIn ? "wait" : "pointer" }}
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Redirecting to sign in…
              </>
            ) : (
              <>
                <LogIn size={15} /> Sign in to continue
              </>
            )}
          </button>
          {!isConfigured && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 12px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "6px",
                color: "#92400e",
                fontSize: "12px",
                textAlign: "left",
                lineHeight: "1.4",
              }}
            >
              <strong>OAuth Setup Required:</strong>
              <div style={{ marginTop: "4px" }}>
                <code>MANUS_OAUTH_PORTAL_URL</code> and <code>MANUS_PROJECT_ID</code> must be configured in environment variables.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isOperationsUser = ["owner", "admin", "staff"].includes(user.role);
  if (!isOperationsUser) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <span className="admin-gate-icon">
            <LockKeyhole size={22} />
          </span>
          <h1>Access restricted</h1>
          <p>Your account is signed in, but it does not have operations permissions.</p>
          <button
            type="button"
            className="admin-primary"
            onClick={() => onLogout?.()}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return null;
}
