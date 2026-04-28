"use client";

import Link from "next/link";
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

type ApiKeyCreateResult = {
  data: {
    apiKey: {
      id: string;
      name: string;
      keyPrefix: string;
      createdAt: string;
      lastUsedAt: string | null;
      revokedAt: string | null;
    };
    secret: string;
  };
};

export function DashboardClient() {
  const csrfRef = useRef<string>("");

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectApiKeySecret, setNewProjectApiKeySecret] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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
      // TODO: re-enable login gate before showcasing
      // setIsLoggedIn(false);
      setIsLoggedIn(true); // SKIP_AUTH mode — no login required
    } finally {
      setSessionChecked(true);
    }
  }, [bootstrapCsrf, loadProjects]);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  const handleEmailLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSigningIn(true);
      setStatusMessage("");
      try {
        if (!csrfRef.current) {
          await bootstrapCsrf();
        }

        const result = await apiCall<{ user?: AppUser }>("POST", "/api/core/auth/login", {
          email: loginEmail,
          password: loginPassword,
        });

        setUser(result.user ?? null);
        await loadProjects();
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Sign-in failed. Try again.");
      } finally {
        setIsSigningIn(false);
      }
    },
    [apiCall, bootstrapCsrf, loadProjects, loginEmail, loginPassword],
  );

  const createProject = useCallback(async () => {
    if (!projectName.trim()) return;

    try {
      setNewProjectApiKeySecret("");
      const created = await apiCall<{ data: ProjectSummary }>("POST", "/api/core/projects", {
        displayName: projectName.trim(),
      });

      let defaultSecret = "";
      try {
        const defaultKey = await apiCall<ApiKeyCreateResult>(
          "POST",
          `/api/core/projects/${created.data.id}/api-keys`,
          { name: "Default client key" },
        );
        defaultSecret = defaultKey.data.secret;
      } catch {
        // Project creation should succeed even if default key creation fails.
      }

      setProjects((previous) => [created.data, ...previous]);
      setProjectName("");
      setShowCreateForm(false);
      setNewProjectApiKeySecret(defaultSecret);
      setStatusMessage(defaultSecret ? "Project created. Copy your default API key now." : "Project created.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create project.");
    }
  }, [apiCall, projectName]);

  // ─── Not yet checked session ───────────────────────────────────────────────
  if (!sessionChecked) {
    return (
      <div className={styles.loadingScreen}>
        <p>Loading…</p>
      </div>
    );
  }

  // ─── Sign-in page — TODO: re-enable before showcasing ─────────────────────
  // if (!isLoggedIn) { ... email/password form ... }
  if (false) {
    return (
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
            <form onSubmit={(e) => { void handleEmailLogin(e); }} className={styles.loginForm}>
              <input
                className={styles.loginInput}
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                className={styles.loginInput}
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="submit" className={styles.loginButton} disabled={isSigningIn}>
                {isSigningIn ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.appShell}>

        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarBrand}>
            <span className={styles.logoMark}>B</span>
            <span className={styles.logoText}>Buildstack</span>
          </div>
          <div className={styles.topBarRight}>
            <span className={styles.topBarEmail}>{user?.email}</span>
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

          {newProjectApiKeySecret ? (
            <div className={styles.apiKeyReveal}>
              <p className={styles.projectCardDate}>Default API key for your new project (shown once):</p>
              <code className={styles.apiKeyValue}>{newProjectApiKeySecret}</code>
            </div>
          ) : null}

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
                  <Link href={`/projects/${project.id}/api#api-connect`} className={styles.openProjectBtn}>
                    Connect app →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
  );
}

