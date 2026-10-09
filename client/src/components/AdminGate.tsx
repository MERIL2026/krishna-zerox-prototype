import { useState } from "react";
import { LockKeyhole, LogIn, Loader2, ShieldCheck, UserCheck, KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { startLogin, isManusOAuthConfigured } from "@/const";
import { trpc } from "@/lib/trpc";
import type { User } from "../../../drizzle/schema";

interface AdminGateProps {
  loading?: boolean;
  user?: User | null;
  onLogout?: () => void | Promise<void>;
}

export default function AdminGate({ loading, user, onLogout }: AdminGateProps) {
  const [authMode, setAuthMode] = useState<"demo" | "oauth">("demo");
  const [selectedRole, setSelectedRole] = useState<"owner" | "staff" | "customer">("owner");
  const [passcode, setPasscode] = useState("krishna2026");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const utils = trpc.useUtils();
  const configQuery = trpc.auth.config.useQuery();
  const demoLoginMutation = trpc.auth.demoLogin.useMutation();

  const isOAuthConfigured = typeof window !== "undefined" ? isManusOAuthConfigured() : true;
  const isDemoAuthEnabled = configQuery.data?.demoAuthEnabled ?? true;

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
    const handleOAuthSignIn = async () => {
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

    const handleDemoSignIn = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoggingIn) return;
      setIsLoggingIn(true);

      try {
        const res = await demoLoginMutation.mutateAsync({
          role: selectedRole,
          passcode: passcode.trim(),
        });

        if (res.success) {
          toast.success("Signed in successfully", {
            description: `Active role: ${selectedRole.toUpperCase()} (${res.user?.name || "Operations"})`,
          });
          await utils.auth.me.invalidate();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid credentials or demo authentication disabled";
        toast.error("Sign-in Failed", {
          description: message,
          duration: 6000,
        });
      } finally {
        setIsLoggingIn(false);
      }
    };

    return (
      <div className="admin-gate">
        <div className="admin-gate-card" style={{ width: "min(440px, 100%)", textAlign: "left" }}>
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
            <span className="admin-gate-icon" style={{ margin: "0 auto 12px" }}>
              <LockKeyhole size={22} />
            </span>
            <h1 style={{ fontSize: "24px", marginBottom: "6px" }}>Operations Sign-In</h1>
            <p style={{ margin: "0 auto", fontSize: "13px" }}>
              Access the Paperlane / Krishna Xerox shop operations dashboard.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              padding: "4px",
              background: "#f1f5f9",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => setAuthMode("demo")}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                background: authMode === "demo" ? "#ffffff" : "transparent",
                color: authMode === "demo" ? "#0f172a" : "#64748b",
                boxShadow: authMode === "demo" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <KeyRound size={14} /> Operations Demo
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("oauth")}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                background: authMode === "oauth" ? "#ffffff" : "transparent",
                color: authMode === "oauth" ? "#0f172a" : "#64748b",
                boxShadow: authMode === "oauth" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <ShieldCheck size={14} /> Manus OAuth
            </button>
          </div>

          {authMode === "demo" ? (
            <form onSubmit={handleDemoSignIn}>
              {/* Persona Selection */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#475569",
                    marginBottom: "6px",
                  }}
                >
                  Select Persona / Role
                </label>
                <div style={{ display: "grid", gap: "8px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      border: `1.5px solid ${selectedRole === "owner" ? "#2563eb" : "#e2e8f0"}`,
                      background: selectedRole === "owner" ? "#eff6ff" : "#ffffff",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="owner"
                      checked={selectedRole === "owner"}
                      onChange={() => setSelectedRole("owner")}
                    />
                    <div>
                      <strong style={{ display: "block", color: "#1e293b" }}>👑 Meril Patel (Owner)</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Full administrative and operations control</span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      border: `1.5px solid ${selectedRole === "staff" ? "#2563eb" : "#e2e8f0"}`,
                      background: selectedRole === "staff" ? "#eff6ff" : "#ffffff",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="staff"
                      checked={selectedRole === "staff"}
                      onChange={() => setSelectedRole("staff")}
                    />
                    <div>
                      <strong style={{ display: "block", color: "#1e293b" }}>📋 Shop Staff</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Manage orders and printing workflows</span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      border: `1.5px solid ${selectedRole === "customer" ? "#2563eb" : "#e2e8f0"}`,
                      background: selectedRole === "customer" ? "#eff6ff" : "#ffffff",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={selectedRole === "customer"}
                      onChange={() => setSelectedRole("customer")}
                    />
                    <div>
                      <strong style={{ display: "block", color: "#1e293b" }}>🛍️ Demo Customer (Riya)</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Storefront only (demonstrates access gate restriction)</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Passcode input */}
              <div style={{ marginBottom: "18px" }}>
                <label
                  htmlFor="operations-passcode"
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#475569",
                    marginBottom: "6px",
                  }}
                >
                  Operations Passcode
                </label>
                <input
                  id="operations-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  required
                />
                <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  Controlled passcode verified server-side with rate limiting.
                </span>
              </div>

              <button
                type="submit"
                className="admin-primary"
                disabled={isLoggingIn || !isDemoAuthEnabled}
                aria-busy={isLoggingIn}
                style={{ width: "100%", justifyContent: "center", cursor: isLoggingIn ? "wait" : "pointer" }}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Verifying credentials…
                  </>
                ) : (
                  <>
                    <LogIn size={15} /> Sign in as {selectedRole.toUpperCase()}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "#475569", marginBottom: "16px", textAlign: "left" }}>
                Sign in with your centralized Manus platform account to inherit enterprise identity and OAuth federation.
              </p>
              <button
                type="button"
                className="admin-primary"
                onClick={handleOAuthSignIn}
                disabled={isLoggingIn}
                aria-busy={isLoggingIn}
                style={{ width: "100%", justifyContent: "center", cursor: isLoggingIn ? "wait" : "pointer" }}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Redirecting to OAuth portal…
                  </>
                ) : (
                  <>
                    <LogIn size={15} /> Continue with Manus OAuth
                  </>
                )}
              </button>

              {!isOAuthConfigured && (
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
                    <code>MANUS_OAUTH_PORTAL_URL</code> and <code>MANUS_PROJECT_ID</code> are not configured in this environment. Use the <strong>Operations Demo</strong> tab above to sign in immediately.
                  </div>
                </div>
              )}
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
          <span className="admin-gate-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
            <LockKeyhole size={22} />
          </span>
          <h1>Access Restricted</h1>
          <p>
            You are signed in as <strong>{user.name || user.email || "Customer"}</strong> (Role: <em>{user.role}</em>). Operations workspace access requires staff, admin, or owner privileges.
          </p>
          <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
            <button
              type="button"
              className="admin-primary"
              onClick={() => onLogout?.()}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Sign out / Switch account
            </button>
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "8px 12px",
                fontSize: "13px",
                textAlign: "center",
                color: "#475569",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Return to Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
