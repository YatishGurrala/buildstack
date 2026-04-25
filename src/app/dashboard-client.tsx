"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./page.module.css";

type AppUser = {
  email?: string;
};

type ProjectSummary = {
  id: string;
  key: string;
  schemaName: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
  usage: {
    storageBytes: number;
  };
};

function formatStorage(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

type ApiError = {
  error?: {
    message?: string;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (container: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "179267377700-uuvka05i5t2g0tjte70ivg3692ko97um.apps.googleusercontent.com";

export function DashboardClient() {
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const csrfRef = useRef<string>("");

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const captureCsrf = useCallback(
    (response: Response) => {
      const token = response.headers.get("x-csrf-token");
      if (token) {
        csrfRef.current = token;
      }
    },
    [],
  );

  const bootstrapCsrf = useCallback(async () => {
    const response = await fetch("/api/health", {
      method: "GET",
      credentials: "include",
    });
    captureCsrf(response);
  }, [captureCsrf]);

  const apiCall = useCallback(
    async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()) && csrfRef.current) {
        headers["X-CSRF-Token"] = csrfRef.current;
      }

      const response = await fetch(path, {
        method,
        credentials: "include",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      captureCsrf(response);

      const payload = (await response.json()) as T & ApiError;
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unexpected server error");
      }

      return payload;
    },
    [captureCsrf],
  );

  const loadProjects = useCallback(async () => {
    const res = await apiCall<{ data: ProjectSummary[] }>("GET", "/api/core/projects");
    setProjects(res.data);
    setIsLoggedIn(true);
  }, [apiCall]);

  const initializeSession = useCallback(async () => {
    try {
      await bootstrapCsrf();
      await loadProjects();
    } catch {
      setIsLoggedIn(false);
    } finally {
      setSessionChecked(true);
    }
  }, [bootstrapCsrf, loadProjects]);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  const handleGoogleSignIn = useCallback(
    async (idToken: string) => {
      setIsSigningIn(true);
      setStatusMessage("Signing in…");
      try {
        if (!csrfRef.current) {
          await bootstrapCsrf();
        }

        const result = await apiCall<{ user?: AppUser }>("POST", "/api/core/auth/google", {
          idToken,
        });

        setUser(result.user ?? null);
        await loadProjects();
        setStatusMessage("");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Sign-in failed. Try again.");
      } finally {
        setIsSigningIn(false);
      }
    },
    [apiCall, bootstrapCsrf, loadProjects],
  );

  const setupGoogleButton = useCallback(() => {
    if (!window.google || !googleButtonRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => {
        void handleGoogleSignIn(credential);
      },
    });

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "signin_with",
    });
  }, [handleGoogleSignIn]);

  useEffect(() => {
    if (!sessionChecked || isLoggedIn) {
      return;
    }

    if (window.google && googleButtonRef.current) {
      setupGoogleButton();
    }
  }, [isLoggedIn, sessionChecked, setupGoogleButton]);

  const signOut = useCallback(async () => {
    try {
      await apiCall("POST", "/api/core/auth/logout");
      setUser(null);
      setIsLoggedIn(false);
      setProjects([]);
    } catch {
      // ignore
    }
  }, [apiCall]);

  const createProject = useCallback(async () => {
    if (!projectName.trim()) return;

    try {
      const created = await apiCall<{ data: ProjectSummary }>("POST", "/api/core/projects", {
        displayName: projectName.trim(),
      });
      setProjects((previous) => [created.data, ...previous]);
      setProjectName("");
      setShowCreateForm(false);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create project.");
    }
  }, [apiCall, projectName]);

  // ─── Not yet checked session ───────────────────────────────────────────────
  if (!sessionChecked) {
    return (
      <>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={setupGoogleButton} />
        <div className={styles.loadingScreen}>
          <p>Loading…</p>
        </div>
      </>
    );
  }

  // ─── Sign-in page ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={setupGoogleButton} />
        <div className={styles.signInPage}>
          <div className={styles.signInCard}>
            <div className={styles.signInLogo}>
              <span className={styles.logoMark}>B</span>
              <span className={styles.logoText}>Buildstack</span>
            </div>
            <h1 className={styles.signInTitle}>Welcome back</h1>
            <p className={styles.signInSub}>
              Sign in to manage your backend projects — auth, database, APIs and more, all in one place.
            </p>
            {statusMessage ? <p className={styles.signInError}>{statusMessage}</p> : null}
            <div ref={googleButtonRef} className={styles.googleSlot} aria-label="Google sign-in button" />
            {isSigningIn ? <p className={styles.signInHint}>Signing you in…</p> : null}
          </div>
        </div>
      </>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={setupGoogleButton} />
      <div className={styles.appShell}>

        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarBrand}>
            <span className={styles.logoMark}>B</span>
            <span className={styles.logoText}>Buildstack</span>
          </div>
          <div className={styles.topBarRight}>
            <span className={styles.topBarEmail}>{user?.email}</span>
            <button type="button" onClick={signOut} className={styles.signOutBtn}>
              Sign out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className={styles.dashMain}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>All projects</h1>
              <p className={styles.dashSub}>Each project is an isolated workspace with its own auth, database, and APIs.</p>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? "Cancel" : "+ New project"}
            </button>
          </div>

          {/* Error message */}
          {statusMessage ? <p className={styles.errorBanner}>{statusMessage}</p> : null}

          {/* Create form */}
          {showCreateForm ? (
            <div className={styles.createFormCard}>
              <h2 className={styles.createFormTitle}>Create a new project</h2>
              <p className={styles.createFormSub}>Give your project a name. You can always rename it later.</p>
              <div className={styles.createFormRow}>
                <input
                  className={styles.createInput}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Payments API, User Auth Service"
                  onKeyDown={(e) => { if (e.key === "Enter") void createProject(); }}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={createProject}
                  disabled={!projectName.trim()}
                >
                  Create project
                </button>
              </div>
            </div>
          ) : null}

          {/* Project grid or empty state */}
          {projects.length === 0 && !showCreateForm ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <h2 className={styles.emptyTitle}>No projects yet</h2>
              <p className={styles.emptySub}>
                Create your first project to get a backend workspace with auth, a database, REST APIs, and analytics — ready out of the box.
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setShowCreateForm(true)}
              >
                Create your first project
              </button>
            </div>
          ) : (
            <ul className={styles.projectGrid}>
              {projects.map((project) => (
                <li key={project.id} className={styles.projectCard}>
                  <div className={styles.projectCardTop}>
                    <span className={styles.projectAvatar}>{project.displayName.charAt(0).toUpperCase()}</span>
                    <span className={styles.projectRole}>{project.role}</span>
                  </div>
                  <h2 className={styles.projectCardName}>{project.displayName}</h2>
                  <p className={styles.projectCardKey}>/{project.key}</p>
                  <p className={styles.projectCardDate}>Schema {project.schemaName}</p>
                  <p className={styles.projectCardDate}>
                    Created {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className={styles.projectCardDate}>Storage {formatStorage(project.usage.storageBytes)}</p>
                  <Link href={`/projects/${project.id}`} className={styles.openProjectBtn}>
                    Open project →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
}

