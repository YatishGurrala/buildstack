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

  const totalStorageBytes = projects.reduce((sum, project) => sum + project.usage.storageBytes, 0);
  const lastCreatedAt = projects.length
    ? [...projects]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        ?.createdAt
    : null;

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
    <div className={styles.consoleShell}>
      <aside className={styles.consoleSidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.logoMark}>B</span>
          <div>
            <p className={styles.logoText}>Buildstack</p>
            <p className={styles.sidebarMeta}>Production Cluster</p>
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/" className={`${styles.sidebarNavItem} ${styles.sidebarNavItemActive}`}>Projects</Link>
          <Link href="/docs/connect-app" className={styles.sidebarNavItem}>Documentation</Link>
          <a href="https://builddeck.io/contact" className={styles.sidebarNavItem}>Support</a>
          <a href="https://builddeck.io/about" className={styles.sidebarNavItem}>Settings</a>
        </nav>
        <div className={styles.sidebarFooter}>{user?.email ?? "internal@builddeck.io"}</div>
      </aside>

      <div className={styles.consoleMain}>
        <header className={styles.consoleTopbar}>
          <p className={styles.topbarPath}>Dashboard / Projects</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setShowCreateForm(true)}
          >
            + Create Project
          </button>
        </header>

        <main className={styles.consoleContent}>
          <div className={styles.dashHeader}>
            <div>
              <h1 className={styles.dashTitle}>Projects</h1>
              <p className={styles.dashSub}>Manage your backend environments, keys, and service access from one place.</p>
            </div>
          </div>

          {statusMessage ? <p className={styles.errorBanner}>{statusMessage}</p> : null}

          {newProjectApiKeySecret ? (
            <div className={styles.apiKeyReveal}>
              <p className={styles.projectCardDate}>Default API key for your new project (shown once):</p>
              <code className={styles.apiKeyValue}>{newProjectApiKeySecret}</code>
            </div>
          ) : null}

          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>::</div>
              <h2 className={styles.emptyTitle}>No projects yet</h2>
              <p className={styles.emptySub}>
                Create your first project to provision auth, records, APIs, and analytics in one isolated workspace.
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
            <div className={styles.dashboardGrid}>
              <ul className={styles.projectGrid}>
                {projects.map((project) => (
                  <li key={project.id} className={styles.projectCard}>
                    <div className={styles.projectCardTop}>
                      <span className={styles.projectAvatar}>{project.displayName.charAt(0).toUpperCase()}</span>
                      <span className={styles.projectRole}>{project.role}</span>
                    </div>
                    <h2 className={styles.projectCardName}>{project.displayName}</h2>
                    <p className={styles.projectCardKey}>bs_key_{project.key.slice(0, 4)}...{project.key.slice(-2)}</p>
                    <p className={styles.projectCardDate}>Schema {project.schemaName}</p>
                    <div className={styles.storageTrack}>
                      <span style={{ width: `${Math.max(8, Math.min(100, Math.round(project.usage.storageBytes / (1024 * 1024))))}%` }} />
                    </div>
                    <p className={styles.projectCardDate}>Storage {formatStorage(project.usage.storageBytes)}</p>
                    <div className={styles.projectActions}>
                      <Link href={`/projects/${project.id}`} className={styles.openProjectBtn}>Open</Link>
                      <Link href={`/projects/${project.id}/api#api-connect`} className={styles.openProjectBtnSecondary}>Connect</Link>
                    </div>
                  </li>
                ))}
              </ul>

              <section className={styles.quickStatsCard}>
                <h2 className={styles.quickStatsTitle}>Quick Stats</h2>
                <div className={styles.quickStatRow}>
                  <span>Total Projects</span>
                  <strong>{projects.length}</strong>
                </div>
                <div className={styles.quickStatRow}>
                  <span>Total Storage</span>
                  <strong>{formatStorage(totalStorageBytes)}</strong>
                </div>
                <div className={styles.quickStatRow}>
                  <span>Latest Created</span>
                  <strong>
                    {lastCreatedAt
                      ? new Date(lastCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "-"}
                  </strong>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {showCreateForm ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.createFormCard}>
            <h2 className={styles.createFormTitle}>Create New Project</h2>
            <p className={styles.createFormSub}>Initialize a new backend workspace and generate a default API key.</p>
            <div className={styles.createFormRow}>
              <input
                className={styles.createInput}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. buildstack-dashboard-v3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void createProject();
                  }
                }}
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={createProject}
                disabled={!projectName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

