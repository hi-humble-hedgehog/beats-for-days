import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

async function assertBornAccessible(page: Page) {
  const axeResults = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .analyze();
  expect(axeResults.violations).toEqual([]);

  const labelPass = axeResults.passes.find((pass) => pass.id === "label");
  const placeholderOnlyNodes =
    labelPass?.nodes.filter((node) => {
      const checkIds = (node.any ?? []).map((check) => check.id);
      return (
        checkIds.length > 0 &&
        checkIds.every((id) => id === "non-empty-placeholder")
      );
    }) ?? [];
  expect(placeholderOnlyNodes).toEqual([]);

  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollEl = document.scrollingElement ?? document.documentElement;
    return Math.round(scrollEl.scrollWidth - vw);
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("Navigation & static pages", () => {
  test("redirects /beats to the root landing page", async ({ page }) => {
    await page.goto("/beats");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeVisible();
  });

  test("renders 404 for an unknown beat ID, keeps playback paused, and starts next beat on Play", async ({
    page,
  }) => {
    const response = await page.goto("/beat/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: /404 — Beat Not Found/i }),
    ).toBeVisible();

    const playerBar = page.getByRole("complementary", {
      name: "Persistent Audio Player",
    });
    await expect(
      playerBar.getByRole("button", { name: "Play audio" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Start Radio Stream/i }).click();
    await expect(page).toHaveURL(/\/beat\/track-[a-c]/);
    await expect(
      page.getByRole("main").getByText("Playing", { exact: true }),
    ).toBeVisible();
    await expect(
      playerBar.getByRole("button", { name: "Pause audio" }),
    ).toBeVisible();
  });

  test("navigates across About, Terms of Service, and Privacy Policy via header links", async ({
    page,
  }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");
    await expect(
      page.getByRole("heading", { level: 1, name: "About Beats for Days" }),
    ).toBeVisible();

    await nav.getByRole("link", { name: "Terms" }).click();
    await expect(page).toHaveURL("/terms-of-service");
    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeVisible();

    await nav.getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL("/privacy-policy");
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeVisible();

    await page
      .getByRole("banner")
      .getByRole("link", { name: /Beats for Days/i })
      .click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Debug panel", () => {
  // The e2e web server runs with DEBUG_PANEL=true (playwright.config.ts).
  const toggleName = "Toggle history debug panel";

  test("stays hidden without ?debug=1", async ({ page }) => {
    await page.goto("/beat/track-a");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: toggleName })).toHaveCount(0);
  });

  test("shows playback and history state with ?debug=1", async ({ page }) => {
    await page.goto("/beat/track-a?debug=1");
    const debugButton = page.getByRole("button", { name: toggleName });
    await expect(debugButton).toBeVisible();
    await debugButton.click();

    const debugRegion = page.getByRole("region", {
      name: "Playback and history state",
    });
    await expect(debugRegion).toBeVisible();
    await expect(debugRegion).toContainText("Played History");
    await expect(debugRegion).toContainText("History Stack Length:");

    await debugRegion
      .getByRole("button", { name: "Close debug panel" })
      .click();
    await expect(debugRegion).not.toBeVisible();
  });
});

test.describe("Radio landing & playback flow", () => {
  test("starts radio stream from home, controls playback in persistent bar, and pauses when returning home", async ({
    page,
  }) => {
    await page.goto("/");

    const playerBar = page.getByRole("complementary", {
      name: "Persistent Audio Player",
    });
    await expect(playerBar).toBeVisible();
    await expect(playerBar.getByText(/Now Playing:/i)).toBeVisible();

    const startButton = page.getByRole("button", {
      name: /Start Radio Stream/i,
    });
    await expect(startButton).toBeVisible();
    await startButton.click();

    await expect(page).toHaveURL(/\/beat\/.+/);
    await expect(
      page.getByRole("main").getByText("Playing", { exact: true }),
    ).toBeVisible();
    await expect(
      playerBar.getByRole("button", { name: "Pause audio" }),
    ).toBeVisible();

    await playerBar.getByRole("button", { name: "Pause audio" }).click();
    await expect(
      page.getByRole("main").getByText("Paused", { exact: true }),
    ).toBeVisible();
    await expect(
      playerBar.getByRole("button", { name: "Play audio" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Play Beat/i }).click();
    await expect(
      page.getByRole("main").getByText("Playing", { exact: true }),
    ).toBeVisible();

    const initialUrl = page.url();
    const initialHeading =
      (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";

    // First skip via persistent player bar
    await playerBar.getByRole("button", { name: "Skip to next track" }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      initialHeading,
    );
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "Loading Beat",
    );
    const firstSkipUrl = page.url();
    expect(firstSkipUrl).not.toBe(initialUrl);
    const firstSkipHeading =
      (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
    await expect(playerBar).toContainText(
      `Now Playing: ${firstSkipHeading.replace(/^#/, "")}`,
    );

    // Second skip via deck Next Beat button
    await page.getByRole("button", { name: /Next Beat/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      firstSkipHeading,
    );
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "Loading Beat",
    );
    const secondSkipUrl = page.url();
    expect(secondSkipUrl).not.toBe(firstSkipUrl);
    const secondSkipHeading =
      (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
    await expect(playerBar).toContainText(
      `Now Playing: ${secondSkipHeading.replace(/^#/, "")}`,
    );

    // Browser Back twice restores first skip then initial beat in URL, heading, and player
    await page.goBack();
    await expect(page).toHaveURL(firstSkipUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      firstSkipHeading,
    );
    await expect(playerBar).toContainText(
      `Now Playing: ${firstSkipHeading.replace(/^#/, "")}`,
    );

    await page.goBack();
    await expect(page).toHaveURL(initialUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      initialHeading,
    );
    await expect(playerBar).toContainText(
      `Now Playing: ${initialHeading.replace(/^#/, "")}`,
    );

    // Browser Forward twice returns to first skip then second skip
    await page.goForward();
    await expect(page).toHaveURL(firstSkipUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      firstSkipHeading,
    );

    await page.goForward();
    await expect(page).toHaveURL(secondSkipUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      secondSkipHeading,
    );
    await expect(playerBar).toContainText(
      `Now Playing: ${secondSkipHeading.replace(/^#/, "")}`,
    );

    await page
      .getByRole("banner")
      .getByRole("link", { name: /Beats for Days/i })
      .click();
    await expect(page).toHaveURL("/");
    await expect(
      playerBar.getByRole("button", { name: "Play audio" }),
    ).toBeVisible();

    // Returning to home and clicking Start Radio Stream again resumes playback on beat deck
    const restartButton = page.getByRole("button", {
      name: /Start Radio Stream/i,
    });
    await expect(restartButton).toBeVisible();
    await restartButton.click();

    await expect(page).toHaveURL(/\/beat\/.+/);
    await expect(
      page.getByRole("main").getByText("Playing", { exact: true }),
    ).toBeVisible();
    await expect(
      playerBar.getByRole("button", { name: "Pause audio" }),
    ).toBeVisible();
  });
});

test.describe("Waitlist & generation flow", () => {
  test("displays live invite pool stats and submits a waitlist signup", async ({
    page,
  }) => {
    await page.goto("/generate");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Generate Boom Bap Beats",
      }),
    ).toBeVisible();
    await expect(page.getByText(/free invites remaining/i)).toBeVisible();

    const emailInput = page.getByLabel("Email address");
    const submitButton = page.getByRole("button", { name: "Join Waitlist" });
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    await emailInput.fill(uniqueEmail);
    await submitButton.click();

    const statusAlert = page.getByRole("status");
    await expect(statusAlert).toBeVisible();
    await expect(statusAlert).toContainText(
      "You're on the list! Check your inbox around noon in your local timezone.",
    );
    await expect(emailInput).toHaveValue("");

    await emailInput.fill(uniqueEmail);
    await submitButton.click();
    await expect(statusAlert).toContainText(
      "You're already on the waitlist! We'll notify you when ready.",
    );
  });
});

test.describe("Born-Accessible UI & WCAG 2.2 AA verification", () => {
  test("exposes semantic landmarks, ARIA live regions, keyboard focus navigation, and reduced motion support", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Persistent Audio Player" }),
    ).toBeVisible();

    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings).toHaveCount(1);

    const liveRegions = page.locator('[aria-live="polite"]');
    await expect(liveRegions.first()).toBeVisible();

    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  for (const route of [
    "/",
    "/beat/track-a",
    "/beat/0001",
    "/generate",
    "/about",
    "/terms-of-service",
    "/privacy-policy",
  ]) {
    test(`has zero axe-core WCAG 2.2 AA violations and reflows at 320px on ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(
        page
          .getByRole("complementary", { name: "Persistent Audio Player" })
          .getByText(/Now Playing:/i),
      ).toBeVisible();
      await assertBornAccessible(page);
    });
  }
});
