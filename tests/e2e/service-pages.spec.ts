import { expect, test } from "@playwright/test";

const projectId = process.env.E2E_PROJECT_ID;
const accessToken = process.env.E2E_ACCESS_TOKEN;
const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const cookieDomain = new URL(baseUrl).hostname;

const requiredEnvIsMissing = !projectId || !accessToken;

test.describe("project service pages (hydrated)", () => {
  test.skip(
    requiredEnvIsMissing,
    "Set E2E_PROJECT_ID and E2E_ACCESS_TOKEN to run authenticated service-page checks.",
  );

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "access_token",
        value: accessToken!,
        domain: cookieDomain,
        path: "/",
        httpOnly: true,
        secure: false,
      },
    ]);
  });

  test("auth service renders hydrated sections", async ({ page }) => {
    await page.goto(`/projects/${projectId}/auth`);
    await expect(page.getByRole("heading", { name: "Available options" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live auth endpoints" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Auth storage for this project" })).toBeVisible();
  });

  test("database service renders hydrated sections", async ({ page }) => {
    await page.goto(`/projects/${projectId}/database`);
    await expect(page.getByRole("heading", { name: "Available options" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Schema details" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tracked storage usage" })).toBeVisible();
  });

  test("api service renders hydrated sections", async ({ page }) => {
    await page.goto(`/projects/${projectId}/api`);
    await expect(page.getByRole("heading", { name: "Available options" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "API access state" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live project endpoints" })).toBeVisible();
  });

  test("analytics service renders hydrated sections", async ({ page }) => {
    await page.goto(`/projects/${projectId}/analytics`);
    await expect(page.getByRole("heading", { name: "Available options" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Current analytics snapshot" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Busiest tracked routes" })).toBeVisible();
  });
});
