import Link from "next/link";

import styles from "./page.module.css";

const registerExample = `curl -X POST "https://stack.builddeck.io/api/v1/<PROJECT_KEY>/auth/register" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <YOUR_API_KEY>" \\
  -d '{
    "email": "alex@acme.com",
    "password": "strong-password-123",
    "metadata": { "plan": "starter" }
  }'`;

const loginExample = `curl -X POST "https://stack.builddeck.io/api/v1/<PROJECT_KEY>/auth/login" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <YOUR_API_KEY>" \\
  -d '{
    "email": "alex@acme.com",
    "password": "strong-password-123"
  }'`;

const createRecordExample = `curl -X POST "https://stack.builddeck.io/api/v1/<PROJECT_KEY>/records" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <YOUR_API_KEY>" \\
  -d '{
    "collection": "orders",
    "ownerId": "user_123",
    "data": { "total": 149.99, "currency": "USD" }
  }'`;

const jsExample = `const BASE_URL = "https://stack.builddeck.io";
const PROJECT_KEY = "<PROJECT_KEY>";
const API_KEY = "<YOUR_API_KEY>";

async function api(path, options = {}) {
  const url = BASE_URL + "/api/v1/" + PROJECT_KEY + path;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json();
  if (!response.ok) throw payload;
  return payload;
}

// 1) Register
await api("/auth/register", {
  method: "POST",
  body: JSON.stringify({
    email: "alex@acme.com",
    password: "strong-password-123",
    metadata: { plan: "starter" },
  }),
});

// 2) Login
const login = await api("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "alex@acme.com",
    password: "strong-password-123",
  }),
});

const userToken = login.token;

// 3) Create record
await api("/records", {
  method: "POST",
  body: JSON.stringify({
    collection: "orders",
    ownerId: login.user.id,
    data: { total: 149.99, currency: "USD" },
  }),
});

// 4) Logout
await api("/auth/logout", {
  method: "POST",
  headers: { "x-user-token": userToken },
});`;

export default function ConnectAppDocsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.backLink} href="/">
          ← Back to Dashboard
        </Link>

        <h1 className={styles.title}>Connect Another App To Your Backend</h1>
        <p className={styles.subtitle}>
          Use this guide to connect web, mobile, or server apps to your Buildstack backend using project keys and API keys.
        </p>

        <section className={styles.section}>
          <h2>1. What you need first</h2>
          <ul>
            <li>Your deployment base URL (example: <span className={styles.inline}>https://stack.builddeck.io</span>)</li>
            <li>Project Key from your project</li>
            <li>API Key secret (shown once when created)</li>
          </ul>
          <p className={styles.note}>
            Keep API keys on trusted backends when possible. If a client app must call directly, use scoped keys and rotate often.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Core endpoint format</h2>
          <p>
            All app-facing endpoints use: <span className={styles.inline}>/api/v1/&lt;PROJECT_KEY&gt;/...</span>
          </p>
          <ul>
            <li>Auth: <span className={styles.inline}>/auth/register</span>, <span className={styles.inline}>/auth/login</span>, <span className={styles.inline}>/auth/logout</span></li>
            <li>Records: <span className={styles.inline}>/records</span> and <span className={styles.inline}>/records/&lt;recordId&gt;</span></li>
            <li>Required header: <span className={styles.inline}>x-api-key: &lt;YOUR_API_KEY&gt;</span></li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Quick test with cURL</h2>
          <p>Register a user:</p>
          <pre className={styles.code}><code>{registerExample}</code></pre>

          <p>Log in user:</p>
          <pre className={styles.code}><code>{loginExample}</code></pre>

          <p>Create a record:</p>
          <pre className={styles.code}><code>{createRecordExample}</code></pre>
        </section>

        <section className={styles.section}>
          <h2>4. JavaScript integration template</h2>
          <pre className={styles.code}><code>{jsExample}</code></pre>
        </section>

        <section className={styles.section}>
          <h2>5. Common response shape</h2>
          <ul>
            <li>Success: usually returns data objects like <span className={styles.inline}>{"{ data: ... }"}</span></li>
            <li>Errors: <span className={styles.inline}>{"{ error: { code, message, details? } }"}</span></li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. CORS and security notes</h2>
          <ul>
            <li>Configure allowed origins in <span className={styles.inline}>CORS_ORIGINS</span> for browser-based apps.</li>
            <li>Never commit API keys to source control.</li>
            <li>Rotate keys if leaked.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
